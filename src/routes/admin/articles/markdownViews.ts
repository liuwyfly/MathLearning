import { type MultipartFile } from "@fastify/multipart";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AuthorizeByRole } from "../../../common/auth";
import { type MultipartField } from "../../../common/multipart";
import {
    ParsePositiveIntegerField,
    ParsePositiveNumberField,
} from "../../../common/validation";
import OSS from "ali-oss";


type PostMarkdownResponse = {
    message: string;
    article_id: number;
    sort: number;
    filename: string;
    size: number;
    result: unknown;
};


class PostMarkdownHelper {
    private fastify: FastifyInstance;
    private request: FastifyRequest;
    private ossClient: OSS;

    private multipartParsed = false;
    private multipartData: {
        articleId: number | null;
        sort: number | null;
        filename: string | null;
        fileBuffer: Buffer | null;
    } = {
        articleId: null,
        sort: null,
        filename: null,
        fileBuffer: null,
    };

    constructor(fastify: FastifyInstance, request: FastifyRequest) {
        this.fastify = fastify;
        this.request = request;
        this.ossClient = new OSS({
            region: process.env.OSS_REGION,
            accessKeyId: process.env.OSS_ACCESS_KEY_ID ?? "",
            accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET ?? "",
            authorizationV4: true,
            bucket: "turbo2016",
        });
    }

    private async parseMultipart(): Promise<void> {
        if (this.multipartParsed) {
            return;
        }
        this.multipartParsed = true;

        if (!this.request.isMultipart()) {
            return;
        }

        // 这个循环只能执行一次，因为 multipart 只能解析一次，解析后数据就被消费掉了
        for await (const part of this.request.parts() as AsyncIterableIterator<
            MultipartFile | MultipartField
        >) {
            if ("file" in part) {
                if (part.fieldname === "file") {
                    this.multipartData.filename = part.filename ?? null;
                    this.multipartData.fileBuffer = await part.toBuffer();
                } else {
                    await part.toBuffer();
                }
                continue;
            }

            if (part.fieldname === "article_id") {
                this.multipartData.articleId = ParsePositiveIntegerField(
                    part.value,
                );
                continue;
            }

            if (part.fieldname === "sort") {
                this.multipartData.sort = ParsePositiveNumberField(part.value);
            }
        }
    }

    async getArticleId(): Promise<number | null> {
        await this.parseMultipart();
        return this.multipartData.articleId;
    }

    async getSort(): Promise<number | null> {
        await this.parseMultipart();
        return this.multipartData.sort;
    }

    async getFilename(): Promise<string | null> {
        await this.parseMultipart();
        return this.multipartData.filename;
    }

    async getFileBuffer(): Promise<Buffer | null> {
        await this.parseMultipart();
        return this.multipartData.fileBuffer;
    }

    async queryContentOssPath(articleId: number): Promise<string | null> {
        const rows = await this.fastify.prisma.$queryRaw<
            { contents_oss_path: string | null }[]
        >`
            SELECT c.oss_path AS contents_oss_path
            FROM mathlearning_article AS a
            INNER JOIN mathlearning_contents AS c ON a.contents_id = c.id
            INNER JOIN mathlearning_contents_articles AS ca ON a.id = ca.article_id
            WHERE a.id = ${articleId}
        `;

        if (!rows || rows.length === 0) {
            return null;
        }

        return rows[0].contents_oss_path ?? null;
    }

    async requestOssFileExists(objectKey: string): Promise<boolean> {
        try {
            await this.ossClient.head(objectKey);
            return true;
        } catch (err: any) {
            if (err.code === "NoSuchKey" || err.status === 404) {
                return false;
            }
            this.fastify.log.error(
                { err, objectKey },
                "check oss file exists failed",
            );
            throw err;
        }
    }

    async uploadOss(objectKey: string, fileBuffer: Buffer): Promise<unknown> {
        const result = await this.ossClient.put(objectKey, fileBuffer, {
            headers: {
                "Content-Type": "text/markdown; charset=utf-8",
            },
        });

        this.fastify.log.info(
            { objectKey },
            "markdown file uploaded to OSS successfully",
        );

        return result;
    }

    async createMarkdownRecord(
        articleId: number,
        ossPath: string,
    ): Promise<void> {
        await this.fastify.prisma.markdown.create({
            data: {
                article_id: articleId,
                oss_path: ossPath,
            },
        });

        this.fastify.log.info(
            { articleId, ossPath },
            "markdown record created successfully",
        );
    }
}

/*
 * 上传 markdown 文件到 OSS
 * url: POST /math-learning/management/articles/markdown
 */
export const PostMarkdown = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<PostMarkdownResponse | never> {
    await request.jwtVerify();
    await AuthorizeByRole(this, request, ["content_admin"]);

    const user = request.user as { uid: number; username: string };
    this.log.info({ uid: user.uid }, "received markdown upload request");

    // 目前仅支持 multipart/form-data 格式的请求
    if (!request.isMultipart()) {
        return reply.status(415).send({
            statusCode: 415,
            error: "Unsupported Media Type",
            message: "Expected multipart/form-data",
        });
    }

    const helper = new PostMarkdownHelper(this, request);

    // step 1: 获取 article_id
    const articleId = await helper.getArticleId();
    if (articleId == null) {
        return reply.badRequest("article_id must be a positive integer");
    }

    // step 2: 查询 oss_path
    const basePath = await helper.queryContentOssPath(articleId);
    if (basePath == null) {
        return reply.badRequest("No oss_path found for the given article_id");
    }

    // 从 multipart 中取出文件信息
    const filename = await helper.getFilename();
    if (filename == null || filename.trim() === "") {
        return reply.badRequest("file filename is required");
    }

    const fileBuffer = await helper.getFileBuffer();
    if (fileBuffer == null) {
        return reply.badRequest("file is required");
    }

    const objectKey = [basePath, filename].join("/");

    // step 3: 检查 OSS 文件是否已存在
    const exists = await helper.requestOssFileExists(objectKey);
    if (exists) {
        this.log.warn(
            { objectKey },
            "oss file already exists and will be overwritten",
        );
        return reply.badRequest(`${objectKey} oss file already exists`);
    }

    // step 4: 上传到 OSS
    const result = await helper.uploadOss(objectKey, fileBuffer);

    // step 5: 创建 Markdown 记录
    await helper.createMarkdownRecord(articleId, objectKey);

    const sort = await helper.getSort();
    if (sort == null) {
        return reply.badRequest("sort must be a positive number");
    }

    return reply.send({
        message: "markdown uploaded",
        article_id: articleId,
        sort,
        filename,
        size: fileBuffer.length,
        result,
    });
};

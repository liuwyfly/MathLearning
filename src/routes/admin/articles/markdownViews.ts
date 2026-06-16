import { type MultipartFile } from "@fastify/multipart";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AuthorizeByRole } from "../../../common/auth";
import { type MultipartField } from "../../../common/multipart";
import { pagination } from "../../../common/pagination";
import {
    ParsePositiveIntegerField,
    ParsePositiveNumberField,
} from "../../../common/validation";
import { MarkdownFilter } from "./markdownFilter";
import { MarkdownValidator } from "./markdownValidator";
import OSS from "ali-oss";
import { prismaLocalNow } from "../../../common/timeUtil";
import { LANGUAGE_ZH_CN, LANGUAGE_EN_US, ROLE_CONTENT_ADMIN } from "../../../common/constants";


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
        language: string;
        fileBuffer: Buffer | null;
    } = {
        articleId: null,
        sort: null,
        filename: null,
        language: "",
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

    async parseMultipart(): Promise<void> {
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
                continue;
            }

            if (part.fieldname === "language") {
                this.multipartData.language = String(part.value ?? "");
            }
        }
    }

    async getArticleId(): Promise<number | null> {
        return this.multipartData.articleId;
    }

    async getSort(): Promise<number | null> {
        return this.multipartData.sort;
    }

    async getLanguage(): Promise<string> {
        return this.multipartData.language;
    }

    async getName(): Promise<string> {
        // name 字段直接用 filename 来代替
        return this.multipartData.filename ?? "";
    }

    async getFilename(): Promise<string | null> {
        return this.multipartData.filename;
    }

    async getFileBuffer(): Promise<Buffer | null> {
        return this.multipartData.fileBuffer;
    }

    async queryContentOssPath(articleId: number): Promise<string | null> {
        const rows = await this.fastify.prisma.$queryRaw<
            { oss_path: string | null }[]
        >`
            SELECT c.oss_path FROM mathlearning_article a
            JOIN mathlearning_contents_articles ca ON
                ca.article_id = a.id
            JOIN mathlearning_contents c ON
                c.id = ca.contents_id
            WHERE a.id = ${articleId}
            ORDER BY article_sort ASC
            LIMIT 1
        `;

        if (!rows || rows.length === 0) {
            return null;
        }

        return rows[0].oss_path ?? null;
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
        language: string,
        name: string,
    ): Promise<void> {
        await this.fastify.prisma.markdown.create({
            data: {
                article_id: articleId,
                name,
                oss_path: ossPath,
                sort: this.multipartData.sort ?? 0,
                language,
                created_at: prismaLocalNow()
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
    // await request.jwtVerify();
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
    await helper.parseMultipart(); // 注意：这个函数必须在获取 article_id 之前调用，以确保 multipart 数据被解析
    const articleId = await helper.getArticleId();
    if (articleId == null) {
        return reply.badRequest("article_id must be a positive integer");
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

    const language = await helper.getLanguage();
    if (language !== LANGUAGE_ZH_CN && language !== LANGUAGE_EN_US) {
        return reply.badRequest(
            `language must be ${LANGUAGE_ZH_CN} or ${LANGUAGE_EN_US}`,
        );
    }

    const name = await helper.getName();
    if (name == null || name.trim() === "") {
        return reply.badRequest("name is required");
    }

    // step 2: 查询 oss_path
    const basePath = await helper.queryContentOssPath(articleId);
    if (basePath == null) {
        return reply.badRequest("No oss_path found for the given article_id");
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
    await helper.createMarkdownRecord(articleId, objectKey, language, name);

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

/*
 * 查询 Markdown 列表
 * url: GET /math-learning/management/articles/markdown_list
 */
export const GetMarkdownList = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<any> {
    await AuthorizeByRole(this, request, ["content_admin"]);

    const { page: p, page_size: ps } = pagination(request);
    const offset = (p - 1) * ps;

    const validator = new MarkdownValidator(this, request);
    const filter = new MarkdownFilter(this, request);

    const validationError = validator.validate();
    if (validationError) {
        return reply
            .status(400)
            .send({ success: false, message: validationError });
    }

    const [listResult, total] = await Promise.all([
        filter.queryList(ps, offset),
        filter.queryCount(),
    ]);

    const list = listResult.map((row: any) => ({
        ...row,
        id: Number(row.id),
        article_id: Number(row.article_id),
        sort: Number(row.sort),
    }));

    return reply.send({
        success: true,
        data: list,
        total,
        page: p,
        page_size: ps,
    });
};

/*
 * 删除 Markdown 文件
 * url: DELETE /math-learning/management/articles/markdown/:id
 */
export const DeleteMarkdown = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<any> {
    await AuthorizeByRole(this, request, [ROLE_CONTENT_ADMIN]);

    const { id } = request.params as { id: string };
    const markdownId = parseInt(id);
    if (isNaN(markdownId)) {
        return reply
            .status(400)
            .send({ success: false, message: "Invalid markdown id" });
    }

    const markdown = await this.prisma.markdown.findUnique({
        where: { id: markdownId },
    });

    if (!markdown) {
        return reply
            .status(404)
            .send({ success: false, message: "Markdown not found" });
    }

    // 从 OSS 删除文件
    const ossClient = new OSS({
        region: process.env.OSS_REGION,
        accessKeyId: process.env.OSS_ACCESS_KEY_ID ?? "",
        accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET ?? "",
        authorizationV4: true,
        bucket: "turbo2016",
    });

    try {
        await ossClient.delete(markdown.oss_path);
        this.log.info(
            { ossPath: markdown.oss_path },
            "markdown file deleted from OSS successfully",
        );
    } catch (err: any) {
        if (err.code === "NoSuchKey" || err.status === 404) {
            this.log.warn(
                { ossPath: markdown.oss_path },
                "oss file not found when deleting",
            );
        } else {
            this.log.error(
                { err, ossPath: markdown.oss_path },
                "delete markdown file from OSS failed",
            );
            throw err;
        }
    }

    // 从数据库删除记录
    await this.prisma.markdown.delete({
        where: { id: markdownId },
    });

    return reply.send({
        success: true,
        message: "Markdown deleted successfully",
    });
};

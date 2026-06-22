import { type MultipartFile } from "@fastify/multipart";
import { type FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import OSS from "ali-oss";
import { AuthorizeByRole } from "../../../common/auth";
import {
    LANGUAGE_LIST,
    ROLE_CONTENT_ADMIN,
    IMAGE_BASE_URL,
} from "../../../common/constants";
import { type MultipartField } from "../../../common/multipart";
import { pagination } from "../../../common/pagination";
import { prismaLocalNow } from "../../../common/timeUtil";
import { ParsePositiveIntegerField } from "../../../common/validation";
import { ProblemFilter } from "./problemFilter";

export type ProblemListQuery = {
    article_id?: string;
    language?: string;
};

export type ProblemParams = {
    id: string;
};

export type PostProblemBody = {
    title: string;
    math_text: string;
    answer: string;
    language: string;
    sort?: number;
    article_id: number;
};

export type PutProblemBody = {
    title?: string;
    math_text?: string;
    answer?: string;
    language?: string;
    sort?: number;
    article_id?: number;
};

export const problemListQuerySchema = {
    type: "object",
    properties: {
        article_id: { type: "string", pattern: "^[1-9]\\d*$" },
        language: { type: "string", minLength: 1 },
        page: { type: "string", pattern: "^[1-9]\\d*$", default: "1" },
        page_size: { type: "string", pattern: "^[1-9]\\d*$", default: "10" },
    },
    additionalProperties: false,
} as const;

export const problemIdParamsSchema = {
    type: "object",
    required: ["id"],
    properties: {
        id: { type: "string", pattern: "^[1-9]\\d*$" },
    },
    additionalProperties: false,
} as const;

export const postProblemBodySchema = {
    type: "object",
    required: ["title", "math_text", "answer", "language", "article_id"],
    properties: {
        title: {
            type: "string",
            minLength: 1,
            maxLength: 255,
            errorMessage: { maxLength: "标题不能超过255个字符" },
        },
        math_text: {
            type: "string",
            minLength: 1,
        },
        answer: {
            type: "string",
            minLength: 1,
        },
        language: {
            type: "string",
            enum: LANGUAGE_LIST,
            errorMessage: {
                enum: `language must be one of ${LANGUAGE_LIST.join(", ")}`,
            },
        },
        sort: {
            type: "number",
            default: 0,
        },
        article_id: {
            type: "number",
        },
    },
    additionalProperties: false,
} as const;

export const putProblemBodySchema = {
    type: "object",
    minProperties: 1,
    properties: {
        title: {
            type: "string",
            minLength: 1,
            maxLength: 255,
            errorMessage: { maxLength: "标题不能超过255个字符" },
        },
        math_text: {
            type: "string",
            minLength: 1,
        },
        answer: {
            type: "string",
            minLength: 1,
        },
        language: {
            type: "string",
            enum: LANGUAGE_LIST,
            errorMessage: {
                enum: `language must be one of ${LANGUAGE_LIST.join(", ")}`,
            },
        },
        sort: {
            type: "number",
        },
        article_id: {
            type: "number",
        },
    },
    additionalProperties: false,
} as const;

/*
 * 查询 Problem 列表
 * url: GET /math-learning/management/articles/problem_list
 */
export const GetProblemList = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<any> {
    await AuthorizeByRole(this, request, [ROLE_CONTENT_ADMIN]);

    const { page: p, page_size: ps } = pagination(request);
    const offset = (p - 1) * ps;

    const filter = new ProblemFilter(this, request);

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
 * 创建 Problem
 * url: POST /math-learning/management/articles/problem
 */
export const PostProblem = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<any> {
    await AuthorizeByRole(this, request, [ROLE_CONTENT_ADMIN]);

    const {
        title,
        math_text,
        answer,
        language,
        sort = 0,
        article_id,
    } = request.body as PostProblemBody;

    const article = await this.prisma.article.findUnique({
        where: { id: article_id },
    });
    if (!article) {
        return reply
            .status(400)
            .send({ success: false, message: "Article not found" });
    }

    const problem = await this.prisma.problem.create({
        data: {
            title,
            math_text,
            answer,
            language,
            sort,
            article_id,
            created_at: prismaLocalNow(),
            updated_at: prismaLocalNow(),
        },
    });

    return reply.status(201).send({ success: true, data: problem });
};

/*
 * 修改 Problem
 * url: PUT /math-learning/management/articles/problem/:id
 */
export const PutProblem = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<any> {
    await AuthorizeByRole(this, request, [ROLE_CONTENT_ADMIN]);

    const { id } = request.params as ProblemParams;
    const problemId = parseInt(id);
    if (isNaN(problemId)) {
        return reply
            .status(400)
            .send({ success: false, message: "Invalid problem id" });
    }

    const problem = await this.prisma.problem.findUnique({
        where: { id: problemId },
    });
    if (!problem) {
        return reply
            .status(404)
            .send({ success: false, message: "Problem not found" });
    }

    const {
        title,
        math_text,
        answer,
        language,
        sort,
        article_id,
    } = request.body as PutProblemBody;

    if (
        language !== undefined && !LANGUAGE_LIST.includes(language)
    ) {
        return reply.badRequest(
            `language must be one of ${LANGUAGE_LIST.join(", ")}`,
        );
    }

    if (article_id !== undefined) {
        const article = await this.prisma.article.findUnique({
            where: { id: article_id },
        });
        if (!article) {
            return reply
                .status(400)
                .send({ success: false, message: "Article not found" });
        }
    }

    const updated = await this.prisma.problem.update({
        where: { id: problemId },
        data: {
            ...(title !== undefined && { title }),
            ...(math_text !== undefined && { math_text }),
            ...(answer !== undefined && { answer }),
            ...(language !== undefined && { language }),
            ...(sort !== undefined && { sort }),
            ...(article_id !== undefined && { article_id }),
            updated_at: prismaLocalNow(),
        },
    });

    return reply.send({ success: true, data: updated });
};

/*
 * 删除 Problem
 * url: DELETE /math-learning/management/articles/problem/:id
 */
export const DeleteProblem = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<any> {
    await AuthorizeByRole(this, request, [ROLE_CONTENT_ADMIN]);

    const { id } = request.params as ProblemParams;
    const problemId = parseInt(id);
    if (isNaN(problemId)) {
        return reply
            .status(400)
            .send({ success: false, message: "Invalid problem id" });
    }

    const problem = await this.prisma.problem.findUnique({
        where: { id: problemId },
    });
    if (!problem) {
        return reply
            .status(404)
            .send({ success: false, message: "Problem not found" });
    }

    await this.prisma.problem.delete({
        where: { id: problemId },
    });

    return reply.send({
        success: true,
        message: "Problem deleted successfully",
    });
};

export const GetProblemDetail = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<any> {
    await AuthorizeByRole(this, request, [ROLE_CONTENT_ADMIN]);

    const { id } = request.params as ProblemParams;
    const problemId = parseInt(id);
    if (isNaN(problemId)) {
        return reply
            .status(400)
            .send({ success: false, message: "Invalid problem id" });
    }

    const problem = await this.prisma.problem.findUnique({
        where: { id: problemId },
        include: { problemImages: true },
    });
    if (!problem) {
        return reply
            .status(404)
            .send({ success: false, message: "Problem not found" });
    }

    const { problemImages, ...rest } = problem;
    const problemImage = problemImages && problemImages.length > 0 ? problemImages[0] : null;

    const data = {
        ...rest,
        problem_image: problemImage
            ? {
                  id: problemImage.id,
                  path: problemImage.path,
                  url: `${IMAGE_BASE_URL}${problemImage.path}`,
              }
            : null,
    };

    return reply.send({ success: true, data });
};

type PostProblemImageResponse = {
    message: string;
    article_id: number;
    filename: string;
    size: number;
    result: unknown;
};

class ProblemImageHelper {
    private fastify: FastifyInstance;
    private request: FastifyRequest;
    private ossClient: OSS;

    private multipartParsed = false;
    private multipartData: {
        articleId: number | null;
        problemId: number | null;
        filename: string | null;
        fileBuffer: Buffer | null;
    } = {
        articleId: null,
        problemId: null,
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

    async parseMultipart(): Promise<void> {
        if (this.multipartParsed) {
            return;
        }
        this.multipartParsed = true;

        if (!this.request.isMultipart()) {
            return;
        }

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

            if (part.fieldname === "problem_id") {
                this.multipartData.problemId = ParsePositiveIntegerField(
                    part.value,
                );
                continue;
            }
        }
    }

    async getArticleId(): Promise<number | null> {
        return this.multipartData.articleId;
    }

    async getProblemId(): Promise<number | null> {
        return this.multipartData.problemId;
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
            SELECT c.oss_path FROM
                mathlearning_article a
            JOIN mathlearning_contents_articles ca ON ca.article_id = a.id
            JOIN mathlearning_contents c ON c.id = ca.contents_id
            WHERE
                a.id = ${articleId}
            ORDER BY
                ca.id ASC
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

    private getContentType(filename: string): string {
        const ext = filename.split(".").pop()?.toLowerCase();
        switch (ext) {
            case "png":
                return "image/png";
            case "jpg":
            case "jpeg":
                return "image/jpeg";
            case "gif":
                return "image/gif";
            case "webp":
                return "image/webp";
            case "svg":
                return "image/svg+xml";
            default:
                return "application/octet-stream";
        }
    }

    async uploadOss(
        objectKey: string,
        fileBuffer: Buffer,
        filename: string,
    ): Promise<unknown> {
        const result = await this.ossClient.put(objectKey, fileBuffer, {
            headers: {
                "Content-Type": this.getContentType(filename),
                "x-oss-forbid-overwrite": true,
            },
        });

        this.fastify.log.info(
            { objectKey },
            "problem image uploaded to OSS successfully",
        );

        return result;
    }

    async createProblemImageRecord(
        articleId: number,
        problemId: number,
        ossPath: string,
    ): Promise<void> {
        await this.fastify.prisma.problemImage.create({
            data: {
                article_id: articleId,
                problem_id: problemId,
                path: ossPath,
                created_at: prismaLocalNow(),
                updated_at: prismaLocalNow(),
            },
        });

        this.fastify.log.info(
            { articleId, ossPath },
            "problem image record created successfully",
        );
    }
}

/**
 * 上传习题图片到 OSS
 * url: POST /math-learning/management/articles/problem_image
 *
 * 请求参数（multipart/form-data）：
 * - article_id: number, 必填，文章 ID（正整数）
 * - problem_id: number, 必填，习题 ID（正整数）
 * - file: File, 必填，图片文件
 */
export const PostProblemImage = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<PostProblemImageResponse | never> {
    await AuthorizeByRole(this, request, [ROLE_CONTENT_ADMIN]);

    const user = request.user as { uid: number; username: string };
    this.log.info({ uid: user.uid }, "received problem image upload request");

    if (!request.isMultipart()) {
        return reply.status(415).send({
            statusCode: 415,
            error: "Unsupported Media Type",
            message: "Expected multipart/form-data",
        });
    }

    const helper = new ProblemImageHelper(this, request);

    await helper.parseMultipart();
    const articleId = await helper.getArticleId();
    if (articleId == null) {
        return reply.badRequest("article_id must be a positive integer");
    }

    const problemId = await helper.getProblemId();
    if (problemId == null) {
        return reply.badRequest("problem_id must be a positive integer");
    }

    const filename = await helper.getFilename();
    if (filename == null || filename.trim() === "") {
        return reply.badRequest("file filename is required");
    }

    const fileBuffer = await helper.getFileBuffer();
    if (fileBuffer == null) {
        return reply.badRequest("file is required");
    }

    const basePath = await helper.queryContentOssPath(articleId);
    if (basePath == null) {
        return reply.badRequest("No oss_path found for the given article_id");
    }

    // 生成 OSS object key，格式：{content_oss_path}/images/{filename}
    const objectKey = [basePath, "images", `aid${articleId}_${filename}`].join("/");

    const exists = await helper.requestOssFileExists(objectKey);
    if (exists) {
        this.log.warn(
            { objectKey },
            "oss file already exists and will be overwritten",
        );
        return reply.badRequest(`${objectKey} oss file already exists`);
    }

    const result = await helper.uploadOss(objectKey, fileBuffer, filename);

    await helper.createProblemImageRecord(articleId, problemId, objectKey);

    return reply.send({
        message: "problem image uploaded",
        article_id: articleId,
        problem_id: problemId,
        filename,
        size: fileBuffer.length,
        result,
    });
};

/*
 * 删除 Problem Image
 * url: DELETE /math-learning/management/articles/problem_image/:id
 */
export const DeleteProblemImage = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<any> {
    await AuthorizeByRole(this, request, [ROLE_CONTENT_ADMIN]);

    const { id } = request.params as ProblemParams;
    const imageId = parseInt(id);
    if (isNaN(imageId)) {
        return reply
            .status(400)
            .send({ success: false, message: "Invalid problem image id" });
    }

    const problemImage = await this.prisma.problemImage.findUnique({
        where: { id: imageId },
    });

    if (!problemImage) {
        return reply
            .status(404)
            .send({ success: false, message: "Problem image not found" });
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
        await ossClient.delete(problemImage.path);
        this.log.info(
            { path: problemImage.path },
            "problem image deleted from OSS successfully",
        );
    } catch (err: any) {
        if (err.code === "NoSuchKey" || err.status === 404) {
            this.log.warn(
                { path: problemImage.path },
                "oss file not found when deleting problem image",
            );
        } else {
            this.log.error(
                { err, path: problemImage.path },
                "delete problem image from OSS failed",
            );
            throw err;
        }
    }

    // 从数据库删除记录
    await this.prisma.problemImage.delete({
        where: { id: imageId },
    });

    return reply.send({
        success: true,
        message: "Problem image deleted successfully",
    });
};

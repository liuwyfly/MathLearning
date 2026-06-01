import { type FastifyReply, FastifyRequest, FastifyInstance } from "fastify";
import { prismaLocalNow } from "../../common/timeUtil";

const OSS_PATH_PATTERN = "^\\/.*[^\\/]$";

type ContentRow = {
    id: number;
    name: string;
    name_en: string | null;
    oss_path: string | null;
    created_at: Date;
    updated_at: Date;
};

type ContentParams = {
    id: string;
};

export type PostContentBody = {
    name: string;
    name_en?: string;
    oss_path?: string;
    sort?: number;
};

export const postContentBodySchema = {
    type: "object" as const,
    required: ["name"],
    properties: {
        name: {
            type: "string" as const,
            minLength: 1,
            maxLength: 256,
            errorMessage: { maxLength: "名称不能超过256个字符" },
        },
        name_en: {
            type: "string" as const,
            maxLength: 256,
            errorMessage: { maxLength: "英文名称不能超过256个字符" },
        },
        oss_path: {
            type: "string" as const,
            pattern: OSS_PATH_PATTERN,
            maxLength: 256,
            errorMessage: {
                maxLength: "资源路径不能超过256个字符",
                pattern: "资源路径必须以/开头且不能以/结尾",
            },
        },
        sort: {
            type: "number" as const,
            default: 0.0,
        },
    },
    additionalProperties: false,
} as const;

export type PutContentBody = {
    name: string;
    name_en: string;
    oss_path?: string;
    sort: number;
};

export const putContentBodySchema = {
    type: "object" as const,
    required: ["name", "name_en", "sort"],
    properties: {
        name: {
            type: "string" as const,
            minLength: 1,
            maxLength: 256,
            errorMessage: { maxLength: "名称不能超过256个字符" },
        },
        name_en: {
            type: "string" as const,
            minLength: 1,
            maxLength: 256,
            errorMessage: { maxLength: "英文名称不能超过256个字符" },
        },
        oss_path: {
            type: "string" as const,
            pattern: OSS_PATH_PATTERN,
            maxLength: 256,
            errorMessage: {
                maxLength: "资源路径不能超过256个字符",
                pattern: "资源路径必须以/开头且不能以/结尾",
            },
        },
        sort: {
            type: "number" as const,
        },
    },
    additionalProperties: false,
} as const;

function parseContentId(id: string): number | null {
    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

function normalizeNameEn(nameEn: unknown): string | null {
    if (nameEn == null) {
        return null;
    }

    if (typeof nameEn !== "string") {
        return null;
    }

    return nameEn.trim();
}

function normalizeOssPath(ossPath: unknown): string | null {
    if (ossPath == null) {
        return null;
    }

    if (typeof ossPath !== "string") {
        return null;
    }

    return ossPath.trim();
}

function isValidOssPath(ossPath: string): boolean {
    return /^\/.*[^/]$/.test(ossPath);
}

export const GetContents = async function (
    this: FastifyInstance,
    _request: FastifyRequest,
    reply: FastifyReply,
): Promise<{ data: ContentRow[] } | never> {
    // 这里打印 log
    // 输出 Header Authentication 的值
    const authHeader =
        _request.headers["authorization"] || _request.headers["Authorization"];
    this.log.info({ authHeader }, "get contents list, authorization header");
    // 输出 log uid
    const uid = (_request.user as Record<string, unknown> | undefined)?.uid;
    this.log.info({ uid }, "jwt decoded uid");

    try {
        const rows = await this.prisma.contents.findMany({
            orderBy: [
                { sort: "asc" },
                { id: "desc" },
            ],
        });

        return { data: rows };
    } catch (err) {
        this.log.error({ err }, "query contents list failed");
        return reply.internalServerError("query contents failed") as never;
    }
};

export const GetContesDetail = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<ContentRow | never> {
    const id = parseContentId((request.params as ContentParams).id);
    if (id == null) {
        return reply.badRequest("id must be a positive integer") as never;
    }

    try {
        const row = await this.prisma.contents.findUnique({
            where: { id },
        });

        if (row == null) {
            return reply.notFound(`Contents not found id: ${id}`) as never;
        }

        return row;
    } catch (err) {
        this.log.error({ err, id }, "query contents by id failed");
        return reply.internalServerError("query content failed") as never;
    }
};

export const PostContent = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<ContentRow | never> {
    const uid = (request.user as Record<string, unknown> | undefined)?.uid;
    this.log.info({ uid }, "jwt decoded uid");

    const {
        name,
        name_en: nameEnRaw,
        oss_path: ossPathRaw,
        sort,
    } = request.body as PostContentBody;
    if (typeof name !== "string" || name.trim() === "") {
        return reply.badRequest("name is required") as never;
    }

    if (nameEnRaw != null && typeof nameEnRaw !== "string") {
        return reply.badRequest("name_en must be a string") as never;
    }

    if (ossPathRaw != null && typeof ossPathRaw !== "string") {
        return reply.badRequest("oss_path must be a string") as never;
    }

    const normalizedName = name.trim();
    const normalizedNameEn = normalizeNameEn(nameEnRaw);
    const normalizedOssPath = normalizeOssPath(ossPathRaw);

    if (normalizedOssPath != null && !isValidOssPath(normalizedOssPath)) {
        return reply.badRequest("oss_path must start with / and not end with /") as never;
    }

    const sortValue = typeof sort === "number" ? sort : 0;

    try {
        const now = prismaLocalNow();
        const createdRow = await this.prisma.contents.create({
            data: {
                name: normalizedName,
                name_en: normalizedNameEn,
                oss_path: normalizedOssPath,
                sort: sortValue,
                created_at: now,
                updated_at: now,
            },
        });

        reply.code(201);
        return createdRow;
    } catch (err) {
        this.log.error({ err }, "insert contents failed");
        return reply.internalServerError("create content failed") as never;
    }
};

export const PutContent = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<ContentRow | never> {
    const id = parseContentId((request.params as ContentParams).id);
    if (id == null) {
        return reply.badRequest("id must be a positive integer") as never;
    }

    const {
        name,
        name_en: nameEnRaw,
        oss_path: ossPathRaw,
        sort,
    } = request.body as PutContentBody;
    if (typeof name !== "string" || name.trim() === "") {
        return reply.badRequest("name is required") as never;
    }

    if (nameEnRaw != null && typeof nameEnRaw !== "string") {
        return reply.badRequest("name_en must be a string") as never;
    }

    if (ossPathRaw != null && typeof ossPathRaw !== "string") {
        return reply.badRequest("oss_path must be a string") as never;
    }

    const normalizedName = name.trim();
    const normalizedNameEn = normalizeNameEn(nameEnRaw);
    const normalizedOssPath = normalizeOssPath(ossPathRaw);

    if (normalizedOssPath != null && !isValidOssPath(normalizedOssPath)) {
        return reply.badRequest("oss_path must start with / and not end with /") as never;
    }

    try {
        const updateResult = await this.prisma.contents.updateMany({
            where: { id },
            data: {
                name: normalizedName,
                name_en: normalizedNameEn,
                oss_path: normalizedOssPath,
                sort: sort,
                updated_at: prismaLocalNow(),
            },
        });

        if (updateResult.count === 0) {
            return reply.notFound("content not found") as never;
        }

        const updatedRow = await this.prisma.contents.findUnique({
            where: { id },
        });

        if (updatedRow == null) {
            return reply.internalServerError(
                "query updated content failed",
            ) as never;
        }

        return updatedRow;
    } catch (err) {
        this.log.error({ err, id }, "update contents failed");
        return reply.internalServerError("update content failed") as never;
    }
};

export const DeleteContent = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<void | never> {
    const id = parseContentId((request.params as ContentParams).id);
    if (id == null) {
        return reply.badRequest("id must be a positive integer") as never;
    }

    try {
        const deleteResult = await this.prisma.contents.deleteMany({
            where: { id },
        });

        if (deleteResult.count === 0) {
            return reply.notFound("content not found") as never;
        }

        reply.code(204);
        return reply.send();
    } catch (err) {
        this.log.error({ err, id }, "delete contents failed");
        return reply.internalServerError("delete content failed") as never;
    }
};

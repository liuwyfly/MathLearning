import { type FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AuthorizeByRole } from "../../../common/auth";
import { ROLE_CONTENT_ADMIN } from "../../../common/constants";
import { pagination } from "../../../common/pagination";

export type ArticleListQuery = {
    contents_id?: string;
};

export type ArticleParams = {
    id: string;
};

export type PostArticleBody = {
    title: string;
    title_en?: string;
    contents_id: number;
    article_sort?: number;
};

export type PutArticleBody = {
    title?: string;
    title_en?: string;
    contents_id?: number;
    article_sort?: number;
};

export const articleIdParamsSchema = {
    type: "object",
    required: ["id"],
    properties: {
        id: { type: "string", pattern: "^[1-9]\\d*$" },
    },
    additionalProperties: false,
} as const;

export const articleListQuerySchema = {
    type: "object",
    properties: {
        contents_id: { type: "string", pattern: "^[1-9]\\d*$" },
        page: { type: "string", pattern: "^[1-9]\\d*$", default: "1" },
        page_size: { type: "string", pattern: "^[1-9]\\d*$", default: "10" },
    },
    additionalProperties: false,
} as const;

export const postArticleBodySchema = {
    type: "object",
    required: ["title", "contents_id"],
    properties: {
        title: {
            type: "string",
            minLength: 1,
            maxLength: 5,
            errorMessage: { maxLength: "标题不能超过256个字符" },
        },
        title_en: {
            type: "string",
            maxLength: 384,
            errorMessage: { maxLength: "英文标题不能超过384个字符" },
        },
        contents_id: { type: "number" },
        article_sort: { type: "number", default: 0.0 },
    },
    additionalProperties: false,
} as const;

export const putArticleBodySchema = {
    type: "object",
    minProperties: 1,
    properties: {
        title: {
            type: "string",
            minLength: 1,
            maxLength: 256,
            errorMessage: {
                maxLength: "标题不能超过256个字符",
            },
        },
        title_en: {
            type: "string",
            maxLength: 384,
            errorMessage: {
                maxLength: "英文标题不能超过384个字符",
            },
        },
        contents_id: { type: "number" },
        article_sort: { type: "number" },
    },
    additionalProperties: false,
} as const;

export const GetArticles = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<any> {
    const { contents_id } = request.query as ArticleListQuery;
    const { page: p, page_size: ps } = pagination(request);

    const where: any = {};
    if (contents_id) {
        where.contentsArticles = {
            some: {
                contents_id: Number(contents_id),
            },
        };
    }

    const [articles, total] = await Promise.all([
        this.prisma.article.findMany({
            where,
            orderBy: { id: "desc" },
            skip: (p - 1) * ps,
            take: ps,
        }),
        this.prisma.article.count({ where }),
    ]);

    return reply.send({
        success: true,
        data: articles,
        total,
        page: p,
        page_size: ps,
    });
};

export const GetArticleDetail = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<any> {
    const { id } = request.params as { id: string };

    const articleId = parseInt(id);
    if (isNaN(articleId)) {
        return reply
            .status(400)
            .send({ success: false, message: "Invalid article id" });
    }

    const article = await this.prisma.article.findUnique({
        where: { id: articleId },
    });

    if (!article) {
        return reply
            .status(404)
            .send({ success: false, message: "Article not found" });
    }

    return reply.send({ success: true, data: article });
};

export const PostArticle = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<{ success: boolean; data: any } | never> {
    // 验证角色
    await AuthorizeByRole(this, request, [ROLE_CONTENT_ADMIN]);
    const {
        title,
        title_en,
        contents_id,
        article_sort = 0.0,
    } = request.body as {
        title: string;
        title_en?: string;
        contents_id: number;
        article_sort?: number;
    };

    // 在事务中创建 article 并关联 ContentsArticle，保证原子性
    const article = await this.prisma.$transaction(async (tx) => {
        const articleObj = await tx.article.create({
            data: {
                title,
                title_en: title_en || null,
            },
        });

        await tx.contentsArticle.create({
            data: {
                contents_id: Number(contents_id),
                article_id: articleObj.id,
                article_sort: article_sort,
            },
        });

        return articleObj;
    });

    return reply.status(201).send({ success: true, data: article });
};

export const PutArticle = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<{ success: boolean; data: any } | never> {
    const { id } = request.params as { id: string };
    const { title, title_en } = request.body as {
        title?: string;
        title_en?: string;
    };

    const articleId = parseInt(id);
    if (isNaN(articleId)) {
        return reply
            .status(400)
            .send({ success: false, message: "Invalid article id" });
    }

    const article = await this.prisma.article.findUnique({
        where: { id: articleId },
    });

    if (!article) {
        return reply
            .status(404)
            .send({ success: false, message: "Article not found" });
    }

    const updatedArticle = await this.prisma.article.update({
        where: { id: articleId },
        data: {
            ...(title !== undefined && { title }),
            ...(title_en !== undefined && { title_en }),
        },
    });

    return reply.send({ success: true, data: updatedArticle });
};

export const DeleteArticle = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<{ success: boolean; message?: string } | never> {
    const { id } = request.params as { id: string };

    const articleId = parseInt(id);
    if (isNaN(articleId)) {
        return reply
            .status(400)
            .send({ success: false, message: "Invalid article id" });
    }

    const article = await this.prisma.article.findUnique({
        where: { id: articleId },
    });

    if (!article) {
        return reply
            .status(404)
            .send({ success: false, message: "Article not found" });
    }

    await this.prisma.article.delete({
        where: { id: articleId },
    });

    return reply.send({
        success: true,
        message: "Article deleted successfully",
    });
};

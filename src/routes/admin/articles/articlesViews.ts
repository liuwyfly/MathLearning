import { type FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AuthorizeByRole } from "../../../common/auth";
import { ROLE_CONTENT_ADMIN } from "../../../common/constants";

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
    sort: number;
};

export type PutArticleBody = {
    title?: string;
    title_en?: string;
    contents_id?: number;
    sort?: number;
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
    },
    additionalProperties: false,
} as const;

export const postArticleBodySchema = {
    type: "object",
    required: ["title", "contents_id", "sort"],
    properties: {
        title: { type: "string", minLength: 1, maxLength: 256 },
        title_en: { type: "string", maxLength: 384 },
        contents_id: { type: "number" },
        sort: { type: "number" },
    },
    additionalProperties: false,
} as const;

export const putArticleBodySchema = {
    type: "object",
    minProperties: 1,
    properties: {
        title: { type: "string", minLength: 1, maxLength: 256 },
        title_en: { type: "string", maxLength: 384 },
        contents_id: { type: "number" },
        sort: { type: "number" },
    },
    additionalProperties: false,
} as const;

export const GetArticles = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<{ data: any[] } | never> {
    const { contents_id } = request.query as { contents_id?: string };

    const articles = await this.prisma.article.findMany({
        where: contents_id ? { contents_id: parseInt(contents_id) } : undefined,
        orderBy: { created_at: "desc" },
    });
    return reply.send({ success: true, data: articles });
};

export const PostArticle = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<{ success: boolean; data: any } | never> {
    // 验证角色
    await AuthorizeByRole(this, request, [ROLE_CONTENT_ADMIN]);
    const { title, title_en, contents_id, sort } = request.body as {
        title: string;
        title_en?: string;
        contents_id: number;
        sort: number;
    };

    // 在事务中创建 article 并关联 ContentsArticle，保证原子性
    const article = await this.prisma.$transaction(async (tx) => {
        const articleObj = await tx.article.create({
            data: {
                title,
                title_en: title_en || null,
                contents_id: Number(contents_id),
                sort: Number(sort),
            },
        });

        await tx.contentsArticle.create({
            data: {
                contents_id: Number(contents_id),
                article_id: articleObj.id,
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

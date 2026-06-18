import { type FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AuthorizeByRole } from "../../../common/auth";
import { ROLE_CONTENT_ADMIN } from "../../../common/constants";
import { pagination } from "../../../common/pagination";
import { prismaLocalNow } from "../../../common/timeUtil";

export type ArticleListQuery = {
    contents_id?: string;
};

export type ArticleDetailQuery = {
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

export const ArticleDetailSchema = {
    type: "object",
    properties: {
        contents_id: { type: "string", pattern: "^[1-9]\\d*$" },
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
            maxLength: 256,
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
    const offset = (p - 1) * ps;

    let articlesPromise;
    let countPromise;

    if (contents_id) {
        const cid = Number(contents_id);
        articlesPromise = this.prisma.$queryRaw`
            SELECT 
                a.id, a.title, a.title_en, a.created_at, a.updated_at,
                ca.article_sort
            FROM mathlearning_article a
            INNER JOIN mathlearning_contents_articles ca ON a.id = ca.article_id
            WHERE ca.contents_id = ${cid}
            ORDER BY ca.article_sort ASC, a.id DESC
            LIMIT ${ps} OFFSET ${offset}
        `;
        countPromise = this.prisma.$queryRaw`
            SELECT COUNT(*) as total 
            FROM mathlearning_article a
            INNER JOIN mathlearning_contents_articles ca ON a.id = ca.article_id
            WHERE ca.contents_id = ${cid}
        `;
    } else {
        articlesPromise = this.prisma.$queryRaw`
            SELECT 
                a.id, a.title, a.title_en, a.created_at, a.updated_at,
                NULL as article_sort
            FROM mathlearning_article a
            ORDER BY a.id DESC
            LIMIT ${ps} OFFSET ${offset}
        `;
        countPromise = this.prisma.$queryRaw`
            SELECT COUNT(*) as total FROM mathlearning_article a
        `;
    }

    const [articlesResult, countResult] = await Promise.all([
        articlesPromise,
        countPromise,
    ]) as [any[], any[]];

    const articles = articlesResult.map((row: any) => ({
        ...row,
        id: Number(row.id),
        article_sort: row.article_sort != null ? Number(row.article_sort) : null,
    }));

    const total = Number((countResult[0] as any)?.total ?? 0);

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
    const { contents_id } = request.query as ArticleDetailQuery;

    const articleId = parseInt(id);
    if (isNaN(articleId)) {
        return reply
            .status(400)
            .send({ success: false, message: "Invalid article id" });
    }

    const article = await this.prisma.article.findUnique({
        where: { id: articleId },
        include: {
            contentsArticles: {
                ...(contents_id != null && contents_id !== ""
                    ? {
                          where: {
                              contents_id: Number(contents_id),
                          },
                      }
                    : {}),
                select: {
                    article_sort: true,
                },
                orderBy: { id: "asc" },
                take: 1,
            },
        },
    });

    if (!article) {
        return reply
            .status(404)
            .send({ success: false, message: "Article not found" });
    }

    const { contentsArticles, ...articleData } = article;

    return reply.send({
        success: true,
        data: {
            ...articleData,
            article_sort: contentsArticles[0]?.article_sort ?? null,
        },
    });
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
                created_at: prismaLocalNow(),
                updated_at: prismaLocalNow(),
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
    const { title, title_en, contents_id, article_sort } =
        request.body as PutArticleBody;

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

    const updatedArticle = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.article.update({
            where: { id: articleId },
            data: {
                ...(title !== undefined && { title }),
                ...(title_en !== undefined && { title_en }),
                updated_at: prismaLocalNow(),
            },
        });

        if (contents_id !== undefined) {
            await tx.contentsArticle.updateMany({
                where: {
                    contents_id,
                    article_id: articleId,
                },
                data: {
                    ...(article_sort !== undefined && { article_sort }),
                },
            });
        }

        return updated;
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

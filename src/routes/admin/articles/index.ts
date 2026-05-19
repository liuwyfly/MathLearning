import { type FastifyPluginAsync } from "fastify";
import {
    GetArticles,
    GetArticleDetail,
    PostArticle,
    PutArticle,
    DeleteArticle,
    type ArticleListQuery,
    ArticleParams,
    PostArticleBody,
    PutArticleBody,
    articleIdParamsSchema,
    articleListQuerySchema,
    postArticleBodySchema,
    putArticleBodySchema,
    ArticleDetailSchema,
} from "./articlesViews";
import { PostMarkdown } from "./markdownViews";

const articles: FastifyPluginAsync = async (fastify): Promise<void> => {
    // 获取文章列表
    fastify.get<{ Querystring: ArticleListQuery }>(
        "/articles",
        {
            onRequest: [fastify.authenticate],
            schema: { querystring: articleListQuerySchema },
        },
        GetArticles,
    );

    // 创建文章
    fastify.post<{ Body: PostArticleBody }>(
        "/articles",
        {
            onRequest: [fastify.authenticate],
            schema: { body: postArticleBodySchema },
        },
        PostArticle,
    );

    // 获取单个文章详情
    fastify.get<{ Params: ArticleParams }>(
        "/article/:id",
        {
            onRequest: [fastify.authenticate],
            schema: { params: articleIdParamsSchema, querystring: ArticleDetailSchema },
        },
        GetArticleDetail,
    );

    // 编辑文章
    fastify.put<{ Params: ArticleParams; Body: PutArticleBody }>(
        "/article/:id",
        {
            onRequest: [fastify.authenticate],
            schema: {
                params: articleIdParamsSchema,
                body: putArticleBodySchema,
            },
        },
        PutArticle,
    );

    // 删除文章
    fastify.delete<{ Params: ArticleParams }>(
        "/articles/:id",
        {
            onRequest: [fastify.authenticate],
            schema: { params: articleIdParamsSchema },
        },
        DeleteArticle,
    );

    // 上传文章的 Markdown 文件
    fastify.post("/markdown", PostMarkdown);
};

export default articles;

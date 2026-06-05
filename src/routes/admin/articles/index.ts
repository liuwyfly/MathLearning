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
import { PostMarkdown, GetMarkdownList, DeleteMarkdown } from "./markdownViews";
import {
    GetProblemList,
    GetProblemDetail,
    PostProblem,
    PutProblem,
    DeleteProblem,
    PostProblemImage,
    DeleteProblemImage,
    type PostProblemBody,
    type PutProblemBody,
    type ProblemParams,
    problemIdParamsSchema,
    postProblemBodySchema,
    putProblemBodySchema,
} from "./problemViews";

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
            schema: {
                params: articleIdParamsSchema,
                querystring: ArticleDetailSchema,
            },
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
    fastify.post(
        "/markdown",
        { onRequest: [fastify.authenticate] },
        PostMarkdown,
    );

    // 查询 Markdown 列表
    fastify.get(
        "/markdown_list",
        { onRequest: [fastify.authenticate] },
        GetMarkdownList,
    );

    // 删除 Markdown 文件
    fastify.delete(
        "/markdown/:id",
        { onRequest: [fastify.authenticate] },
        DeleteMarkdown,
    );

    // 查询 Problem 列表
    fastify.get(
        "/problem_list",
        { onRequest: [fastify.authenticate] },
        GetProblemList,
    );

    // 创建 Problem
    fastify.post<{ Body: PostProblemBody }>(
        "/problem",
        {
            onRequest: [fastify.authenticate],
            schema: { body: postProblemBodySchema },
        },
        PostProblem,
    );

    // 根据 problem id 获取 Problem 详情
    fastify.get<{ Params: ProblemParams }>("/problem/:id", {
        onRequest: [fastify.authenticate],
        schema: { params: problemIdParamsSchema },
    }, GetProblemDetail);

    // 修改 Problem
    fastify.put<{ Params: ProblemParams; Body: PutProblemBody }>(
        "/problem/:id",
        {
            onRequest: [fastify.authenticate],
            schema: {
                params: problemIdParamsSchema,
                body: putProblemBodySchema,
            },
        },
        PutProblem,
    );

    // 删除 Problem
    fastify.delete<{ Params: ProblemParams }>(
        "/problem/:id",
        {
            onRequest: [fastify.authenticate],
            schema: { params: problemIdParamsSchema },
        },
        DeleteProblem,
    );

    // 上传 习题图片 Problem Image
    fastify.post(
        "/problem_image",
        { onRequest: [fastify.authenticate] },
        PostProblemImage,
    );

    // 按照 id 删除 Problem Image
    fastify.delete<{ Params: ProblemParams }>(
        "/problem_image/:id",
        {
            onRequest: [fastify.authenticate],
            schema: { params: problemIdParamsSchema },
        },
        DeleteProblemImage,
    );
};

export default articles;

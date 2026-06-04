import { type FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AuthorizeByRole } from "../../../common/auth";
import {
    LANGUAGE_ZH_CN,
    LANGUAGE_EN_US,
    ROLE_CONTENT_ADMIN,
} from "../../../common/constants";
import { pagination } from "../../../common/pagination";
import { prismaLocalNow } from "../../../common/timeUtil";
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
    images?: string;
    answer: string;
    language: string;
    sort?: number;
    article_id: number;
};

export type PutProblemBody = {
    title?: string;
    math_text?: string;
    images?: string;
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
        images: {
            type: "string",
            maxLength: 352,
            errorMessage: { maxLength: "图片路径不能超过352个字符" },
        },
        answer: {
            type: "string",
            minLength: 1,
        },
        language: {
            type: "string",
            enum: [LANGUAGE_ZH_CN, LANGUAGE_EN_US],
            errorMessage: {
                enum: `language must be ${LANGUAGE_ZH_CN} or ${LANGUAGE_EN_US}`,
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
        images: {
            type: "string",
            maxLength: 352,
            errorMessage: { maxLength: "图片路径不能超过352个字符" },
        },
        answer: {
            type: "string",
            minLength: 1,
        },
        language: {
            type: "string",
            enum: [LANGUAGE_ZH_CN, LANGUAGE_EN_US],
            errorMessage: {
                enum: `language must be ${LANGUAGE_ZH_CN} or ${LANGUAGE_EN_US}`,
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
        images = "",
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
            images,
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
        images,
        answer,
        language,
        sort,
        article_id,
    } = request.body as PutProblemBody;

    if (
        language !== undefined &&
        language !== LANGUAGE_ZH_CN &&
        language !== LANGUAGE_EN_US
    ) {
        return reply.badRequest(
            `language must be ${LANGUAGE_ZH_CN} or ${LANGUAGE_EN_US}`,
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
            ...(images !== undefined && { images }),
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
    });
    if (!problem) {
        return reply
            .status(404)
            .send({ success: false, message: "Problem not found" });
    }

    return reply.send({ success: true, data: problem });
};

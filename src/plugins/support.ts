import fp from "fastify-plugin";
import type { FastifyError } from "fastify";
import { Prisma } from "../generated/prisma-client";

export interface SupportPluginOptions {
    // Specify Support plugin options here
}

// The use of fastify-plugin is required to be able
// to export the decorators to the outer scope
export default fp<SupportPluginOptions>(async (fastify, opts) => {
    fastify.decorate("someSupport", function () {
        return "hugs";
    });

    fastify.setErrorHandler((error, _request, reply) => {
        const fastifyError = error as FastifyError & {
            validation?: Array<{
                instancePath?: string;
                message?: string;
                keyword?: string;
                params?: {
                    missingProperty?: string;
                };
            }>;
        };

        if (fastifyError.validation != null) {
            const requiredMessage = fastifyError.validation
                .flatMap((issue) => {
                    const missingProperty = issue.params?.missingProperty;
                    const keyword = issue.keyword;

                    if (keyword === "required") {
                        return [`缺少字段 ${missingProperty}`];
                    }

                    if (issue.message != null && issue.message !== "") {
                        return [issue.message];
                    }

                    return [];
                })
                .join("; ");

            const localizedMessage =
                requiredMessage !== ""
                    ? requiredMessage
                    : fastifyError.message != null && fastifyError.message !== ""
                    ? fastifyError.message
                    : "请求参数校验失败";

            return reply.status(400).send({
                statusCode: 400,
                code: "FST_ERR_VALIDATION",
                error: "Bad Request",
                message: localizedMessage,
            });
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                return reply.status(409).send({
                    statusCode: 409,
                    code: error.code,
                    error: "Conflict",
                    message: "数据已存在，不能重复创建",
                });
            }

            if (error.code === "P2025") {
                return reply.status(404).send({
                    statusCode: 404,
                    code: error.code,
                    error: "Not Found",
                    message: "目标数据不存在",
                });
            }
        }

        return reply.send(error);
    });
});

// When using .decorate you have to specify added properties for Typescript
declare module "fastify" {
    export interface FastifyInstance {
        someSupport(): string;
    }
}

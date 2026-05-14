import { type FastifyRequest, type FastifyInstance } from "fastify";
import { serviceRequest } from "./httpClient";

interface AuthRoleResponse {
    authorized: boolean;
    error?: string;
}

export async function AuthorizeByRole(
    fastify: FastifyInstance,
    request: FastifyRequest,
    requiredRoles: string[],
): Promise<void> {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
        const err = new Error("Unauthorized: missing authorization header") as Error & { statusCode: number };
        err.statusCode = 401;
        fastify.log.info({ msg: "missing authorization header" }, "authorization failed");
        throw err;
    }

    // 打 log, uid 和 判断的角色
    const user = request.user as { uid: string; username: string } | undefined;
    fastify.log.info({ uid: user?.uid, requiredRoles }, "authorizing user with required roles");

    const authServiceUrl = process.env.AUTH_SERVICE_URL ?? "http://auth-serv:3000";

    let response;
    try {
        response = await serviceRequest(
            `${authServiceUrl}/auth-serv/auth/authorization_role`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: authHeader,
                },
                body: JSON.stringify({ roles: requiredRoles.join(",") }),
            },
        );
    } catch (error) {
        if (error instanceof Error && (error as Error & { statusCode?: number }).statusCode === 504) {
            fastify.log.error({ err: error }, "auth service request timed out");
        } else {
            fastify.log.error({ err: error }, "auth service request failed");
        }
        throw error;
    }

    if (!response.ok) {
        let message: string | undefined;
        try {
            const errorBody = await response.json() as { message?: string };
            message = errorBody.message;
        } catch {
            // ignore parse error
        }
        const err = new Error(`auth-serv service error status: ${response.status} message: ${message}`) as Error & { statusCode: number };
        err.statusCode = response.status;
        fastify.log.error({ status: response.status, message }, "auth-serv returned non-ok");
        throw err;
    }

    const data = (await response.json()) as AuthRoleResponse;

    if (!data.authorized) {
        const err = new Error(data.error ?? "禁止访问: 请检查用户角色") as Error & { statusCode: number };
        err.statusCode = 403;
        fastify.log.warn({ user: request.user, requiredRoles, reason: data.error }, "authorization denied");
        throw err;
    }
}

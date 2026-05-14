/**
 * 服务间 HTTP 请求公共工具
 */

export interface ServiceRequestOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    /** 超时毫秒数，默认 5000 */
    timeoutMs?: number;
}

/**
 * 带超时的服务间 HTTP 请求，超时时抛出 statusCode 为 504 的错误。
 */
export async function serviceRequest(
    url: string,
    options: ServiceRequestOptions = {},
): Promise<Response> {
    const { method = "GET", headers, body, timeoutMs = 5000 } = options;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
        response = await fetch(url, {
            method,
            headers,
            body,
            signal: controller.signal,
        });
        clearTimeout(timeout);
    } catch (error) {
        clearTimeout(timeout);
        if (error instanceof Error && error.name === "AbortError") {
            const err = new Error("请求超时") as Error & { statusCode: number };
            err.statusCode = 504;
            throw err;
        }
        throw error;
    }

    return response;
}

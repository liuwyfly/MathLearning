import { FastifyRequest } from "fastify";

export function pagination(request: FastifyRequest): { page: number; page_size: number } {
    const { page = "1", page_size = "10" } = request.query as { page?: string; page_size?: string };
    let p = parseInt(page, 10);
    let ps = parseInt(page_size, 10);
    if (isNaN(p) || p < 1) p = 1;
    if (isNaN(ps) || ps < 1) ps = 10;
    if (ps > 100) ps = 100;
    return { page: p, page_size: ps };
}

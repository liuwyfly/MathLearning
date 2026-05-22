import { FastifyInstance, FastifyRequest } from "fastify";

export class MarkdownFilter {
    private fastify: FastifyInstance;
    private request: FastifyRequest;
    public articleId: number | null = null;
    public language: string | null = null;

    constructor(fastify: FastifyInstance, request: FastifyRequest) {
        this.fastify = fastify;
        this.request = request;
        this.parseParams();
    }

    private parseParams(): void {
        const { article_id, language } = this.request.query as {
            article_id?: string;
            language?: string;
        };

        if (article_id) {
            const aid = Number(article_id);
            if (!isNaN(aid)) {
                this.articleId = aid;
            }
        }

        if (language && language.trim() !== "") {
            this.language = language.trim();
        }
    }

    async queryList(limit: number, offset: number): Promise<any[]> {
        if (this.articleId !== null && this.language !== null) {
            return this.fastify.prisma.$queryRaw`
                SELECT id, oss_path, article_id, sort, language, created_at
                FROM mathlearning_markdown
                WHERE article_id = ${this.articleId} AND language = ${this.language}
                ORDER BY sort ASC, id DESC
                LIMIT ${limit} OFFSET ${offset}
            `;
        }
        if (this.articleId !== null) {
            return this.fastify.prisma.$queryRaw`
                SELECT id, oss_path, article_id, sort, language, created_at
                FROM mathlearning_markdown
                WHERE article_id = ${this.articleId}
                ORDER BY sort ASC, id DESC
                LIMIT ${limit} OFFSET ${offset}
            `;
        }
        if (this.language !== null) {
            return this.fastify.prisma.$queryRaw`
                SELECT id, oss_path, article_id, sort, language, created_at
                FROM mathlearning_markdown
                WHERE language = ${this.language}
                ORDER BY sort ASC, id DESC
                LIMIT ${limit} OFFSET ${offset}
            `;
        }
        return this.fastify.prisma.$queryRaw`
            SELECT id, oss_path, article_id, sort, language, created_at
            FROM mathlearning_markdown
            ORDER BY sort ASC, id DESC
            LIMIT ${limit} OFFSET ${offset}
        `;
    }

    async queryCount(): Promise<number> {
        let result: any[];
        if (this.articleId !== null && this.language !== null) {
            result = await this.fastify.prisma.$queryRaw`
                SELECT COUNT(*) as total
                FROM mathlearning_markdown
                WHERE article_id = ${this.articleId} AND language = ${this.language}
            `;
        } else if (this.articleId !== null) {
            result = await this.fastify.prisma.$queryRaw`
                SELECT COUNT(*) as total
                FROM mathlearning_markdown
                WHERE article_id = ${this.articleId}
            `;
        } else if (this.language !== null) {
            result = await this.fastify.prisma.$queryRaw`
                SELECT COUNT(*) as total
                FROM mathlearning_markdown
                WHERE language = ${this.language}
            `;
        } else {
            result = await this.fastify.prisma.$queryRaw`
                SELECT COUNT(*) as total FROM mathlearning_markdown
            `;
        }
        return Number(result[0]?.total ?? 0);
    }
}

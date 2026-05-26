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
        const where: any = {};
        if (this.articleId !== null) {
            where.article_id = this.articleId;
        }
        if (this.language !== null) {
            where.language = this.language;
        }

        return this.fastify.prisma.markdown.findMany({
            where,
            select: {
                id: true,
                oss_path: true,
                article_id: true,
                sort: true,
                language: true,
                name: true,
                created_at: true,
            },
            orderBy: [
                { sort: 'asc' },
                { id: 'desc' },
            ],
            take: limit,
            skip: offset,
        });
    }

    async queryCount(): Promise<number> {
        const where: any = {};
        if (this.articleId !== null) {
            where.article_id = this.articleId;
        }
        if (this.language !== null) {
            where.language = this.language;
        }

        return this.fastify.prisma.markdown.count({ where });
    }
}

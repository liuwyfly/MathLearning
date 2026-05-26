import { type FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { pagination } from '../common/pagination'
import { LANGUAGE_EN_US } from '../common/constants';

export type ArticleListQuery = {
    contents_id?: string;
    language?: string;
};

export const GetArticles = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<any> {
    try {
        const { contents_id, language } = request.query as ArticleListQuery;
        const { page: p, page_size: ps } = pagination(request);
        const offset = (p - 1) * ps;

        const isEn = language === LANGUAGE_EN_US;
        const titleSelect = isEn
            ? `COALESCE(NULLIF(a.title_en, ''), a.title)`
            : `a.title`;

        let articlesPromise;
        let countPromise;

        if (contents_id) {
            const cid = Number(contents_id);
            articlesPromise = this.prisma.$queryRawUnsafe(
                `SELECT a.id, ${titleSelect} as title, a.created_at, a.updated_at, ca.article_sort
                 FROM mathlearning_article a
                 INNER JOIN mathlearning_contents_articles ca ON a.id = ca.article_id
                 WHERE ca.contents_id = ?
                 ORDER BY ca.article_sort ASC, a.id DESC
                 LIMIT ? OFFSET ?`,
                cid, ps, offset
            );
            countPromise = this.prisma.$queryRawUnsafe(
                `SELECT COUNT(*) as total 
                 FROM mathlearning_article a
                 INNER JOIN mathlearning_contents_articles ca ON a.id = ca.article_id
                 WHERE ca.contents_id = ?`,
                cid
            );
        } else {
            articlesPromise = this.prisma.$queryRawUnsafe(
                `SELECT a.id, ${titleSelect} as title, a.created_at, a.updated_at, NULL as article_sort
                 FROM mathlearning_article a
                 ORDER BY a.id DESC
                 LIMIT ? OFFSET ?`,
                ps, offset
            );
            countPromise = this.prisma.$queryRawUnsafe(
                `SELECT COUNT(*) as total FROM mathlearning_article`
            );
        }

        const [articlesResult, countResult] = await Promise.all([
            articlesPromise,
            countPromise,
        ]) as [any[], any[]];

        const articles = articlesResult.map((row: any) => ({
            id: Number(row.id),
            title: row.title,
            created_at: row.created_at,
            updated_at: row.updated_at,
            article_sort: row.article_sort != null ? Number(row.article_sort) : null,
        }));

        const total = Number((countResult[0] as any)?.total ?? 0);

        return reply.send({
            data: articles,
            total,
            page: p,
            page_size: ps,
        });
    } catch (err) {
        this.log.error({ err }, 'query articles failed')
        return reply.internalServerError('query articles failed')
    }
}

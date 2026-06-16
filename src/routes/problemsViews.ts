import { type FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { normalizeLanguage } from '../common/language'
import { IMAGE_BASE_URL } from '../common/constants'

export type ProblemListQuery = {
    article_id?: string;
    language?: string;
};

export const GetProblems = async function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<any> {
    try {
        const { article_id, language: rawLanguage } = request.query as ProblemListQuery;
        const language = normalizeLanguage(rawLanguage);

        if (!article_id) {
            return reply.badRequest('article_id is required');
        }

        const articleId = Number(article_id);

        const problems = await this.prisma.problem.findMany({
            where: {
                article_id: articleId,
                language: language,
            },
            orderBy: {
                sort: 'asc',
            },
            include: {
                problemImages: {
                    orderBy: {
                        id: 'asc',
                    },
                    take: 1,
                },
            },
        });

        const data = problems.map((problem) => {
            const image = problem.problemImages[0];
            return {
                id: problem.id,
                title: problem.title,
                math_text: problem.math_text,
                answer: problem.answer,
                language: problem.language,
                sort: problem.sort,
                article_id: problem.article_id,
                created_at: problem.created_at,
                updated_at: problem.updated_at,
                problem_image: image
                    ? {
                        id: image.id,
                        url: `${IMAGE_BASE_URL}${image.path}`,
                    }
                    : null,
            };
        });

        return reply.send({ data });
    } catch (err) {
        this.log.error({ err }, 'query problems failed')
        return reply.internalServerError('query problems failed')
    }
}

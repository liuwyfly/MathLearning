import { type FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

export const GetArticles = async function(this: FastifyInstance, _request: FastifyRequest, reply: FastifyReply): Promise<{ data: any[] } | never> {
    return reply.send({ success: true, data: [] })
}

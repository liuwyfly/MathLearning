import { type FastifyPluginAsync } from 'fastify'

const articles: FastifyPluginAsync = async (fastify): Promise<void> => {
    fastify.get('/articles', async function (_request, reply) {
        return reply.send({ success: true, data: [] })
    })
}

export default articles

import { type FastifyPluginAsync } from 'fastify'
import { GetContents, GetContesDetail, PostContent, PutContent, DeleteContent } from './contentsViews'

const mathLearningAdmin: FastifyPluginAsync = async (fastify): Promise<void> => {
    // ping
    fastify.get('/ping', async function (request, reply) {
        return { pong: true, message: "math-learning" }
    })
    
    // 获取主目录
    fastify.get('/contents', GetContents)
    // 获取一个主目录的详情
    fastify.get('/contents/:id', GetContesDetail)
    // 新建主目录
    fastify.post('/contents', { onRequest: [fastify.authenticate] }, PostContent)
    // 更新主目录
    fastify.put('/contents/:id', { onRequest: [fastify.authenticate] }, PutContent)
    // 删除主目录
    fastify.delete('/contents/:id', { onRequest: [fastify.authenticate] }, DeleteContent)
}

export default mathLearningAdmin

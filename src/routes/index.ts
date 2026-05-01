import { type FastifyPluginAsync } from 'fastify'
import { GetContents } from './contentsViews'

const mathLearning: FastifyPluginAsync = async (fastify): Promise<void> => {
    // ping
    fastify.get('/ping', async function (request, reply) {
        return { pong: true, message: "math-learning" }
    })
    
    // 获取主目录
    fastify.get('/contents', GetContents)
}

export default mathLearning

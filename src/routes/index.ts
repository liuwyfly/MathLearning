import { type FastifyPluginAsync } from 'fastify'
import { GetContents } from './contentsViews'
import { GetArticles } from './articlesViews'

const mathLearning: FastifyPluginAsync = async (fastify): Promise<void> => {
    // ping
    fastify.get('/ping', async function (request, reply) {
        return { pong: true, message: "math-learning" }
    })
    
    // 获取主目录
    fastify.get('/contents', GetContents)

    // 获取文章列表
    fastify.get('/articles', GetArticles)
}

export default mathLearning

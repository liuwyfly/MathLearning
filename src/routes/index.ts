import { type FastifyPluginAsync } from 'fastify'
import { GetContents, type GetContentsQuery, getContentsQuerySchema } from './contentsViews'
import { GetArticles, GetArticleById } from './articlesViews'
import { GetProblems } from './problemsViews'

const mathLearning: FastifyPluginAsync = async (fastify): Promise<void> => {
    // ping
    fastify.get('/ping', async function (request, reply) {
        return { pong: true, message: "math-learning" }
    })
    
    // 获取主目录
    fastify.get<{ Querystring: GetContentsQuery }>('/contents', { schema: { querystring: getContentsQuerySchema } }, GetContents)

    // 获取文章列表
    fastify.get('/articles', GetArticles)

    // 获取文章关联的 Markdown 地址
    fastify.get('/article/:id', GetArticleById)

    // 获取练习题
    fastify.get('/problems', GetProblems)
}

export default mathLearning

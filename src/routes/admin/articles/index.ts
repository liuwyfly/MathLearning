import { type FastifyPluginAsync } from 'fastify'
import { GetArticles } from './articlesViews'
import { PostMarkdown } from './markdownViews'

const articles: FastifyPluginAsync = async (fastify): Promise<void> => {
    // 获取文章列表
    fastify.get('/articles', GetArticles)

    // 上传文章的 Markdown 文件
    fastify.post('/markdown', PostMarkdown)
}

export default articles

import { type FastifyPluginAsync } from 'fastify'
import { GetContents } from './contentsViews'

const mathLearning: FastifyPluginAsync = async (fastify): Promise<void> => {
    // 获取主目录
    fastify.get('/contents', GetContents)
}

export default mathLearning

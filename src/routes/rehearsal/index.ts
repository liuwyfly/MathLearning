import { type FastifyPluginAsync } from 'fastify'
// import { testJwtTokenHandler } from '../auth/testJwtTokenViews'

const mathLearning: FastifyPluginAsync = async (fastify): Promise<void> => {
    // 测试接口，生成 token
    // fastify.post<{ Body: TestJwtTokenBody }>('/test_jwt_token', testJwtTokenHandler)  
}

export default mathLearning

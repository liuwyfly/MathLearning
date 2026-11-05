import { type FastifyPluginAsync } from 'fastify'
import { testMqServiceBody, testMqServiceBodySchema, testMqServicePost } from './testMqServiceView'
import { TestJwtTokenBody, testJwtTokenHandler } from '../auth/testJwtTokenViews'

const mathLearning: FastifyPluginAsync = async (fastify): Promise<void> => {
    // 测试接口，生成 token
    fastify.post<{ Body: TestJwtTokenBody }>('/test_jwt_token', testJwtTokenHandler)

    // 测试向消息服务发请求
    fastify.post<{ Body: testMqServiceBody }>('/test_mq_service', {
        schema: { 
            body: testMqServiceBodySchema
        }
    }, testMqServicePost) // Adjust the body type as needed
}

export default mathLearning

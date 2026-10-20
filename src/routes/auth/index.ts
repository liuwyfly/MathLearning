import { type FastifyPluginAsync } from 'fastify'
import { wechatCodeHandler, wxCodeBodySchema, type WxCodeBody } from './wechatCodeViews'
import { refreshTokenHandler } from './refreshTokenViews'
import { deleteAccountHandler, deleteAccountBodySchema, type DeleteAccountBody } from './deleteAccountViews'
import { testJwtTokenHandler, TestJwtTokenBody } from './testJwtTokenViews'

declare module 'fastify' {
  interface FastifyInstance {
    throttleStore: Map<string, { count: number; start: number }>
  }
}

const auth: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.throttleStore = new Map()

  // 微信登录 通过 code 获取 access_token
  fastify.post<{ Body: WxCodeBody }>('/wechat_code', {
    schema: { body: wxCodeBodySchema }
  }, wechatCodeHandler)

  // 用已有的 jwt token 换新的 jwt token
  fastify.get('/refresh_token', refreshTokenHandler)

  // 注销账号
  fastify.post<{ Body: DeleteAccountBody}>('/delete_account', {
    onRequest: [fastify.authenticate],
    schema: { body: deleteAccountBodySchema }
  }, deleteAccountHandler)

  // 测试接口，生成 token
  // fastify.post<{ Body: TestJwtTokenBody }>('/test_jwt_token', testJwtTokenHandler)
}

export default auth

import { type FastifyPluginAsync } from 'fastify'
import { wechatCodeHandler, wxCodeBodySchema, type WxCodeBody } from './wechatCodeViews'
import { refreshTokenHandler } from './refreshTokenViews'

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
}

export default auth

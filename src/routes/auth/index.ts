import { type FastifyPluginAsync } from 'fastify'
import { wechatCodeHandler, wxCodeBodySchema, type WxCodeBody } from './wechatCodeViews'

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
}

export default auth

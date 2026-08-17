import { type FastifyInstance, FastifyRequest, type FastifyReply } from 'fastify'
import { findOrCreateWechatUser, reqWeixinUserInfo } from './wechatUser'

export interface WxCodeBody {
  code: string
}

export const wxCodeBodySchema = {
  type: 'object',
  required: ['code'],
  properties: {
    code: { type: 'string', minLength: 1 }
  }
}

// 微信 jscode2session / oauth2 access_token 接口的返回结构
interface WxAccessTokenResponse {
  access_token?: string
  expires_in?: number
  refresh_token?: string
  openid?: string
  unionid?: string
  scope?: string
  errcode?: number
  errmsg?: string
}

export async function wechatCodeHandler (
  this: FastifyInstance,
  request: FastifyRequest<{ Body: WxCodeBody }>,
  reply: FastifyReply
): Promise<void> {
  const { code } = request.body

  const appid = process.env.WECHAT_APP_ID
  const secret = process.env.WECHAT_APP_SECRET
  if (!appid || !secret) {
    return reply.code(500).send({ error: 'WeChat appid/secret not configured' })
  }

  // 用前端拿到的 code 向微信服务器换取 access_token
  const url = 'https://api.weixin.qq.com/sns/oauth2/access_token' +
    `?appid=${encodeURIComponent(appid)}` +
    `&secret=${encodeURIComponent(secret)}` +
    `&code=${encodeURIComponent(code)}` +
    '&grant_type=authorization_code'

  let data: WxAccessTokenResponse
  try {
    const res = await fetch(url)
    data = await res.json() as WxAccessTokenResponse
    this.log.info({ code, data }, 'wechat oauth2 debug info')
  } catch (err) {
    request.log.error(err, 'wechat access_token request failed')
    return reply.code(502).send({ error: 'Failed to request WeChat access_token' })
  }

  if (data.errcode || !data.access_token || !data.openid) {
    return reply.code(401).send({ error: data.errmsg ?? 'Invalid wechat code', errcode: data.errcode })
  }

  // 根据 data.openid 查询用户 openid，如果没有则创建新用户
  let wechatUser
  try {
    wechatUser = await findOrCreateWechatUser(this.prisma, data.openid, data.unionid)
  } catch (err) {
    request.log.error(err, 'wechat user upsert failed')
    return reply.code(502).send({ error: 'Failed to query or create wechat user' })
  }

  // 获取用户昵称和头像（失败不阻断登录）
  let profile = wechatUser
  try {
    const updated = await reqWeixinUserInfo(this.prisma, data.access_token, data.openid)
    if (updated) {
      profile = { ...wechatUser, ...updated }
    }
  } catch (err) {
    request.log.warn(err, 'wechat userinfo request failed')
  }

  return reply.send({
    access_token: data.access_token,
    expires_in: data.expires_in,
    refresh_token: data.refresh_token,
    openid: data.openid,
    scope: data.scope,
    user: {
      uid: wechatUser.user.uid,
      openid: wechatUser.openid,
      nickname: profile.nickname,
      avatar_url: profile.avatar_url
    }
  })
}

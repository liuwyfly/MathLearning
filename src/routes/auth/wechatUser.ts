import { randomUUID } from 'node:crypto'
import type { PrismaClient, Prisma, WeixinUser } from '../../generated/prisma-client'
import { prismaLocalNow } from '../../common/timeUtil'

export type WechatUserWithProfile = Prisma.WeixinUserGetPayload<{ include: { user: true } }>

// 微信 sns/userinfo 接口的返回结构（需要 snsapi_userinfo 授权 scope）
interface WxUserInfoResponse {
  openid?: string
  nickname?: string
  headimgurl?: string
  errcode?: number
  errmsg?: string
}

// 根据微信 openid 查询微信用户，不存在则创建新用户（User + WeixinUser）
export async function findOrCreateWechatUser (
  prisma: PrismaClient,
  openid: string,
  unionid?: string | null
): Promise<WechatUserWithProfile> {
  const now = prismaLocalNow()
  return prisma.weixinUser.upsert({
    where: { openid },
    update: unionid ? { unionid, updated_at: now } : {},
    create: {
      openid,
      unionid: unionid ?? null,
      created_at: now,
      updated_at: now,
      user: { create: { uid: randomUUID().replace(/-/g, ''), createdAt: now, updatedAt: now } }
    },
    include: { user: true }
  })
}

// 调用微信 userinfo 接口获取昵称和头像，并更新到 WeixinUser；失败时返回 null
export async function reqWeixinUserInfo (
  prisma: PrismaClient,
  accessToken: string,
  openid: string
): Promise<WeixinUser | null> {
  const url = 'https://api.weixin.qq.com/sns/userinfo' +
    `?access_token=${encodeURIComponent(accessToken)}` +
    `&openid=${encodeURIComponent(openid)}`

  const res = await fetch(url)
  const info = await res.json() as WxUserInfoResponse
  if (info.errcode || info.openid == null) {
    return null
  }

  return prisma.weixinUser.update({
    where: { openid },
    data: {
      nickname: info.nickname ?? null,
      avatar_url: info.headimgurl ?? null
    }
  })
}

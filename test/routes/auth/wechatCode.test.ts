import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../../helper'
import * as wechatUserModule from '../../../src/routes/auth/wechatUser'

// 微信 sns/oauth2/access_token 接口返回的数据（取自真实日志）
const wxTokenData = {
  access_token: '1_V3aqcML48M8LRzJXK7QB7TwfXnWbYl9hECYV8wUIJ4WWVQCyNG_2UmoGheWkuxP7FASA29kQYAOQA0rxIvExwva6ZRgxos0iUTir0Vi8-E98xjt7',
  expires_in: 7200,
  refresh_token: '1_bIhiNGDAcaMFMEhNeruZeJzB_W6K-SaPAPxstiHeJF-nfy3LDXM5lWG1Co-ZbruWt8AOsPJzrsyHG0IOox3RGOsd3-vn0pr9dim7VVSaL9okLrok',
  openid: 'obe1z2UowP5zo2o1WIEw43DW5oC8',
  scope: 'snsapi_userinfo',
  unionid: 'o7tlU2Vn0XtH2A56ShtJT1udNWyo'
}

const fakeWechatUser = {
  openid: wxTokenData.openid,
  unionid: wxTokenData.unionid,
  nickname: null,
  avatar_url: null,
  user: { uid: '0a1b2c3d4e5f60718293a4b5c6d7e8f9' }
}

function jsonResponse (data: unknown): Response {
  return { json: async () => data } as Response
}

// .env 里可能配置了 FASTIFY_ROUTE_PREFIX，测试时去掉前缀，保证路由路径固定。
// 注意：fastify-cli 每次 build 都会重新加载 .env（loadEnvFile 不覆盖已有变量），
// 所以这里要置为空字符串而不是 delete，否则会被 .env 重新填上。
async function buildApp (t: Parameters<typeof build>[0]) {
  const oldPrefix = process.env.FASTIFY_ROUTE_PREFIX
  process.env.FASTIFY_ROUTE_PREFIX = ''
  t.after(() => {
    if (oldPrefix == null) {
      delete process.env.FASTIFY_ROUTE_PREFIX
    } else {
      process.env.FASTIFY_ROUTE_PREFIX = oldPrefix
    }
  })
  return await build(t)
}

test('wechat_code 缺少 code 时返回 400', async (t) => {
  const app = await buildApp(t)

  const res = await app.inject({
    method: 'POST',
    url: '/auth/wechat_code',
    payload: {}
  })

  assert.equal(res.statusCode, 400)
})

test('wechat_code 未配置 WECHAT_APP_ID/SECRET 时返回 500', async (t) => {
  const app = await buildApp(t)

  const oldAppId = process.env.WECHAT_APP_ID
  const oldSecret = process.env.WECHAT_APP_SECRET
  // 置空而不是 delete，避免被 fastify-cli 重新加载的 .env 填回去
  process.env.WECHAT_APP_ID = ''
  process.env.WECHAT_APP_SECRET = ''
  t.after(() => {
    if (oldAppId != null) process.env.WECHAT_APP_ID = oldAppId
    if (oldSecret != null) process.env.WECHAT_APP_SECRET = oldSecret
  })

  const res = await app.inject({
    method: 'POST',
    url: '/auth/wechat_code',
    payload: { code: 'test-code' }
  })

  assert.equal(res.statusCode, 500)
  assert.deepStrictEqual(JSON.parse(res.payload), { error: 'WeChat appid/secret not configured' })
})

test('wechat_code 请求微信接口失败时返回 502', async (t) => {
  const app = await buildApp(t)
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('network down') })

  const res = await app.inject({
    method: 'POST',
    url: '/auth/wechat_code',
    payload: { code: 'test-code' }
  })

  assert.equal(res.statusCode, 502)
  assert.deepStrictEqual(JSON.parse(res.payload), { error: 'Failed to request WeChat access_token' })
})

test('wechat_code 微信返回 errcode 时返回 401', async (t) => {
  const app = await buildApp(t)
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({ errcode: 40029, errmsg: 'invalid code' }))

  const res = await app.inject({
    method: 'POST',
    url: '/auth/wechat_code',
    payload: { code: 'bad-code' }
  })

  assert.equal(res.statusCode, 401)
  assert.deepStrictEqual(JSON.parse(res.payload), { error: 'invalid code', errcode: 40029 })
})

/*
 等价命令
 node --env-file=.env --test -r ts-node/register --test-name-pattern="wechat_code 换取 token 成功并返回 token 和用户信息" test/routes/auth/wechatCode.test.ts
 */
test('wechat_code 换取 token 成功并返回 token 和用户信息', async (t) => {
  const app = await buildApp(t)

  t.mock.method(globalThis, 'fetch', async (url: any) => {
    const u = String(url)
    if (u.includes('/sns/oauth2/access_token')) {
      return jsonResponse(wxTokenData)
    }
    // sns/userinfo 返回昵称和头像
    return jsonResponse({
      openid: wxTokenData.openid,
      nickname: '测试用户',
      headimgurl: 'https://thirdwx.qlogo.cn/mmopen/avatar.jpg'
    })
  })

  // Prisma 7 的 model 委托是 Proxy（每次取方法都返回新函数），mock.method 拦截不了，
  // 改为 mock wechatUser 模块的导出函数（ts-node 编译成 CJS 后，调用处是运行时的属性查找）
  t.mock.method(wechatUserModule, 'findOrCreateWechatUser', async () => fakeWechatUser as any)
  t.mock.method(wechatUserModule, 'reqWeixinUserInfo', async () => ({
    ...fakeWechatUser,
    nickname: '测试用户',
    avatar_url: 'https://thirdwx.qlogo.cn/mmopen/avatar.jpg'
  }) as any)

  const res = await app.inject({
    method: 'POST',
    url: '/auth/wechat_code',
    payload: { code: '041Ads200qCWXW1w80400sKqqI0Ads2Z' }
  })

  assert.equal(res.statusCode, 200)
  const body = JSON.parse(res.payload)
  assert.equal(body.access_token, wxTokenData.access_token)
  assert.equal(body.expires_in, wxTokenData.expires_in)
  assert.equal(body.refresh_token, wxTokenData.refresh_token)
  assert.equal(body.openid, wxTokenData.openid)
  assert.equal(body.scope, wxTokenData.scope)
  assert.deepStrictEqual(body.user, {
    uid: fakeWechatUser.user.uid,
    openid: wxTokenData.openid,
    nickname: '测试用户',
    avatar_url: 'https://thirdwx.qlogo.cn/mmopen/avatar.jpg'
  })
})

test('wechat_code 获取 userinfo 失败时不阻断登录', async (t) => {
  const app = await buildApp(t)

  t.mock.method(globalThis, 'fetch', async (url: any) => {
    const u = String(url)
    if (u.includes('/sns/oauth2/access_token')) {
      return jsonResponse(wxTokenData)
    }
    // sns/userinfo 返回错误（例如 scope 不是 snsapi_userinfo）
    return jsonResponse({ errcode: 48001, errmsg: 'api unauthorized' })
  })

  // 只 mock 用户查询/创建；reqWeixinUserInfo 走真实逻辑，
  // userinfo 接口返回 errcode 时它在访问数据库前就返回 null
  t.mock.method(wechatUserModule, 'findOrCreateWechatUser', async () => fakeWechatUser as any)

  const res = await app.inject({
    method: 'POST',
    url: '/auth/wechat_code',
    payload: { code: '041Ads200qCWXW1w80400sKqqI0Ads2Z' }
  })

  assert.equal(res.statusCode, 200)
  const body = JSON.parse(res.payload)
  assert.equal(body.access_token, wxTokenData.access_token)
  assert.deepStrictEqual(body.user, {
    uid: fakeWechatUser.user.uid,
    openid: wxTokenData.openid,
    nickname: null,
    avatar_url: null
  })
})

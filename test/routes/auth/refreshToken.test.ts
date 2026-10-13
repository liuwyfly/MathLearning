import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../../helper'

// .env 里可能配置了 FASTIFY_ROUTE_PREFIX，测试时去掉前缀，保证路由路径固定。
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

const jwtPayload = { uid: '0a1b2c3d4e5f60718293a4b5c6d7e8f9' }

/*
 等价命令
 node --env-file=.env --test -r ts-node/register --test-name-pattern="refresh_token" test/routes/auth/refreshToken.test.ts
 */
test('refresh_token 缺少 authorization header 时返回 401', async (t) => {
  const app = await buildApp(t)

  const res = await app.inject({
    method: 'GET',
    url: '/auth/refresh_token'
  })

  assert.equal(res.statusCode, 401)
})

test('refresh_token token 非法时返回 401', async (t) => {
  const app = await buildApp(t)

  const res = await app.inject({
    method: 'GET',
    url: '/auth/refresh_token',
    headers: { authorization: 'Bearer not-a-token' }
  })

  assert.equal(res.statusCode, 401)
  assert.deepStrictEqual(JSON.parse(res.payload), { error: 'Invalid or expired token' })
})

test('refresh_token 过期 token 返回 401', async (t) => {
  const app = await buildApp(t)

  const expired = app.jwt.sign(jwtPayload, { expiresIn: -1 })

  const res = await app.inject({
    method: 'GET',
    url: '/auth/refresh_token',
    headers: { authorization: `Bearer ${expired}` }
  })

  assert.equal(res.statusCode, 401)
})

test('refresh_token 有效 token 换取新 token', async (t) => {
  const app = await buildApp(t)

  const oldToken = app.jwt.sign(jwtPayload, { expiresIn: '7d' })

  const res = await app.inject({
    method: 'GET',
    url: '/auth/refresh_token',
    headers: { authorization: `Bearer ${oldToken}` }
  })

  assert.equal(res.statusCode, 200)
  const body = JSON.parse(res.payload)
  assert.equal(typeof body.token, 'string')
  assert.ok(body.token.length > 0)
  const decoded = app.jwt.verify(body.token) as { uid: string; exp: number }
  assert.equal(decoded.uid, jwtPayload.uid)
  assert.equal(typeof decoded.exp, 'number')
})

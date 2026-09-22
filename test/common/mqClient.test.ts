import * as assert from 'node:assert'
import { test } from 'node:test'

import { SendMqMessage } from '../../src/common/mqClient'

type HeaderMap = Record<string, string> | undefined

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8')
}

test('SendMqMessage injects bearer token built from API_USER', async () => {
  const originalFetch = globalThis.fetch
  const originalApiUser = process.env.API_USER
  const originalJwtSecret = process.env.JWT_SECRET

  process.env.API_USER = 'HanTu'
  process.env.JWT_SECRET = 'test-secret'

  let capturedHeaders: HeaderMap
  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    capturedHeaders = init?.headers as HeaderMap
    return new Response(null, { status: 200 })
  }) as typeof fetch

  try {
    await SendMqMessage('lesson.created', { id: 1 })
  } finally {
    globalThis.fetch = originalFetch
    process.env.API_USER = originalApiUser
    process.env.JWT_SECRET = originalJwtSecret
  }

  assert.ok(capturedHeaders)
  const authorization = capturedHeaders.Authorization
  assert.ok(authorization?.startsWith('Bearer '))
  assert.equal(capturedHeaders['Content-Type'], 'application/json')

  const token = authorization.slice('Bearer '.length)
  const [, payload] = token.split('.')
  assert.ok(payload)
  const decodedPayload = JSON.parse(decodeBase64Url(payload)) as {
    uid: string
    iat: number
    exp: number
  }
  assert.equal(decodedPayload.uid, 'HanTu')
  assert.equal(typeof decodedPayload.iat, 'number')
  assert.equal(typeof decodedPayload.exp, 'number')
  assert.ok(decodedPayload.exp > decodedPayload.iat)
})

test('SendMqMessage logs via Fastify logger when provided', async () => {
  const originalFetch = globalThis.fetch
  const originalApiUser = process.env.API_USER
  const originalJwtSecret = process.env.JWT_SECRET

  process.env.API_USER = 'HanTu'
  process.env.JWT_SECRET = 'test-secret'

  const logCalls: unknown[][] = []
  const fakeFastify = {
    log: {
      info: (...args: unknown[]) => {
        logCalls.push(args)
      }
    }
  } as any

  globalThis.fetch = (async () => new Response(null, { status: 200 })) as typeof fetch

  try {
    await SendMqMessage('lesson.created', { id: 1 }, fakeFastify.log)
  } finally {
    globalThis.fetch = originalFetch
    process.env.API_USER = originalApiUser
    process.env.JWT_SECRET = originalJwtSecret
  }

  assert.equal(logCalls.length, 1)
  assert.deepEqual(logCalls[0][0], { topic: 'lesson.created', param: { id: 1 } })
  assert.equal(logCalls[0][1], 'SendMqMessage debug')
})

test('SendMqMessage throws when API_USER is missing', async () => {
  const originalApiUser = process.env.API_USER
  delete process.env.API_USER

  try {
    await assert.rejects(
      () => SendMqMessage('lesson.created', { id: 1 }),
      /API_USER 未配置/
    )
  } finally {
    process.env.API_USER = originalApiUser
  }
})
import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper'

test('contents route returns all rows from mathlearning_contents', async (t) => {
  const rows = [
    {
      id: 1,
      name: 'Limits',
      name_en: 'Limits',
      created_at: '2026-04-16 10:00:00',
      updated_at: '2026-04-16 10:00:00'
    },
    {
      id: 2,
      name: 'Derivatives',
      name_en: 'Derivatives',
      created_at: '2026-04-16 10:01:00',
      updated_at: '2026-04-16 10:01:00'
    }
  ]

  const app = await build(t)
  t.mock.method(app.mysql, 'query', async () => [rows] as any)

  const res = await app.inject({
    method: 'GET',
    url: '/contents'
  })

  assert.equal(res.statusCode, 200)
  assert.deepStrictEqual(JSON.parse(res.payload), rows)
})

test('contents route supports FASTIFY_ROUTE_PREFIX', async (t) => {
  const oldPrefix = process.env.FASTIFY_ROUTE_PREFIX
  process.env.FASTIFY_ROUTE_PREFIX = '/math-learning'

  t.after(() => {
    if (oldPrefix == null) {
      delete process.env.FASTIFY_ROUTE_PREFIX
      return
    }

    process.env.FASTIFY_ROUTE_PREFIX = oldPrefix
  })

  const app = await build(t)
  t.mock.method(app.mysql, 'query', async () => [[]] as any)

  const withoutPrefix = await app.inject({
    method: 'GET',
    url: '/contents'
  })
  assert.equal(withoutPrefix.statusCode, 404)

  const withPrefix = await app.inject({
    method: 'GET',
    url: '/math-learning/contents'
  })
  assert.equal(withPrefix.statusCode, 200)
  assert.deepStrictEqual(JSON.parse(withPrefix.payload), [])
})

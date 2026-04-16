import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../../helper'

test('management contents list returns rows', async (t) => {
  const rows = [
    {
      id: 1,
      name: 'Limits',
      name_en: 'Limits',
      created_at: '2026-04-16 10:00:00',
      updated_at: '2026-04-16 10:00:00'
    }
  ]

  const app = await build(t)
  t.mock.method(app.mysql, 'query', async () => [rows] as any)

  const res = await app.inject({
    method: 'GET',
    url: '/management/contents'
  })

  assert.equal(res.statusCode, 200)
  assert.deepStrictEqual(JSON.parse(res.payload), rows)
})

test('management contents get by id returns one row', async (t) => {
  const row = {
    id: 1,
    name: 'Limits',
    name_en: 'Limits',
    created_at: '2026-04-16 10:00:00',
    updated_at: '2026-04-16 10:00:00'
  }

  const app = await build(t)
  t.mock.method(app.mysql, 'query', async () => [[row]] as any)

  const res = await app.inject({
    method: 'GET',
    url: '/management/contents/1'
  })

  assert.equal(res.statusCode, 200)
  assert.deepStrictEqual(JSON.parse(res.payload), row)
})

test('management contents create validates required name', async (t) => {
  const app = await build(t)

  const res = await app.inject({
    method: 'POST',
    url: '/management/contents',
    payload: {
      name_en: 'Limits'
    }
  })

  assert.equal(res.statusCode, 400)
  assert.match(res.payload, /name is required/)
})

test('management contents create inserts and returns row', async (t) => {
  const createdRow = {
    id: 3,
    name: 'Integrals',
    name_en: 'Integrals',
    created_at: '2026-04-16 10:02:00',
    updated_at: '2026-04-16 10:02:00'
  }

  const app = await build(t)

  let queryCall = 0
  t.mock.method(app.mysql, 'execute', async () => [{ insertId: 3, affectedRows: 1 }] as any)
  t.mock.method(app.mysql, 'query', async () => {
    queryCall += 1
    if (queryCall === 1) {
      return [[createdRow]] as any
    }

    return [[]] as any
  })

  const res = await app.inject({
    method: 'POST',
    url: '/management/contents',
    payload: {
      name: 'Integrals',
      name_en: 'Integrals'
    }
  })

  assert.equal(res.statusCode, 201)
  assert.deepStrictEqual(JSON.parse(res.payload), createdRow)
})

test('management contents update returns 404 when id missing', async (t) => {
  const app = await build(t)
  t.mock.method(app.mysql, 'execute', async () => [{ affectedRows: 0 }] as any)

  const res = await app.inject({
    method: 'PUT',
    url: '/management/contents/999',
    payload: {
      name: 'Updated Name',
      name_en: 'Updated Name'
    }
  })

  assert.equal(res.statusCode, 404)
  assert.match(res.payload, /content not found/)
})

test('management contents delete returns 204 when deleted', async (t) => {
  const app = await build(t)
  t.mock.method(app.mysql, 'execute', async () => [{ affectedRows: 1 }] as any)

  const res = await app.inject({
    method: 'DELETE',
    url: '/management/contents/1'
  })

  assert.equal(res.statusCode, 204)
  assert.equal(res.payload, '')
})

import * as assert from 'node:assert'
import { test } from 'node:test'
import { build } from '../../helper'

type MultipartField = {
  name: string
  value: string
}

type MultipartFile = {
  name: string
  filename: string
  contentType: string
  content: string
}

function getRoutePrefix (): string {
  const routePrefix = process.env.FASTIFY_ROUTE_PREFIX
  if (routePrefix == null) {
    return ''
  }

  const trimmed = routePrefix.trim()
  if (trimmed === '' || trimmed === '/') {
    return ''
  }

  return trimmed.startsWith('/') ? trimmed.replace(/\/+$/, '') : `/${trimmed.replace(/\/+$/, '')}`
}

function createMultipartPayload (fields: MultipartField[], file?: MultipartFile): { boundary: string, payload: Buffer } {
  const boundary = '----MathLearningBoundary7MA4YWxkTrZu0gW'
  const chunks: string[] = []

  for (const field of fields) {
    chunks.push(`--${boundary}\r\n`)
    chunks.push(`Content-Disposition: form-data; name="${field.name}"\r\n\r\n`)
    chunks.push(`${field.value}\r\n`)
  }

  if (file != null) {
    chunks.push(`--${boundary}\r\n`)
    chunks.push(`Content-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\n`)
    chunks.push(`Content-Type: ${file.contentType}\r\n\r\n`)
    chunks.push(file.content)
    chunks.push('\r\n')
  }

  chunks.push(`--${boundary}--\r\n`)

  return {
    boundary,
    payload: Buffer.from(chunks.join(''), 'utf8')
  }
}

test('management markdown upload parses multipart fields and file', async (t) => {
  const app = await build(t)
  const url = `${getRoutePrefix()}/management/articles/markdown`
  const { boundary, payload } = createMultipartPayload([
    { name: 'article_id', value: '101' },
    { name: 'sort', value: '1' },
    { name: 'language', value: 'zh-CN' }
  ], {
    name: 'file',
    filename: 'intro.md',
    contentType: 'text/markdown',
    content: '# Intro\nhello world\n'
  })

  const res = await app.inject({
    method: 'POST',
    url,
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`
    },
    payload
  })

  assert.equal(res.statusCode, 200)
  assert.deepStrictEqual(JSON.parse(res.payload), {
    message: 'markdown uploaded',
    article_id: 101,
    sort: 1,
    filename: 'intro.md',
    size: Buffer.byteLength('# Intro\nhello world\n')
  })
})

test('management markdown upload defaults language to zh-CN', async (t) => {
  const app = await build(t)
  const url = `${getRoutePrefix()}/management/articles/markdown`
  const { boundary, payload } = createMultipartPayload([
    { name: 'article_id', value: '101' },
    { name: 'sort', value: '1' }
  ], {
    name: 'file',
    filename: 'intro.md',
    contentType: 'text/markdown',
    content: '# Intro\nhello world\n'
  })

  const res = await app.inject({
    method: 'POST',
    url,
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`
    },
    payload
  })

  assert.equal(res.statusCode, 200)
})

test('management markdown upload validates missing file', async (t) => {
  const app = await build(t)
  const url = `${getRoutePrefix()}/management/articles/markdown`
  const { boundary, payload } = createMultipartPayload([
    { name: 'article_id', value: '101' },
    { name: 'sort', value: '1' }
  ])

  const res = await app.inject({
    method: 'POST',
    url,
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`
    },
    payload
  })

  assert.equal(res.statusCode, 400)
  assert.match(res.payload, /file is required/)
})

test('management markdown upload validates article_id and sort', async (t) => {
  const app = await build(t)
  const url = `${getRoutePrefix()}/management/articles/markdown`
  const { boundary, payload } = createMultipartPayload([
    { name: 'article_id', value: 'abc' },
    { name: 'sort', value: '0' }
  ], {
    name: 'file',
    filename: 'intro.md',
    contentType: 'text/markdown',
    content: '# Intro\nhello world\n'
  })

  const res = await app.inject({
    method: 'POST',
    url,
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`
    },
    payload
  })

  assert.equal(res.statusCode, 400)
  assert.match(res.payload, /article_id must be a positive integer/)
})
import { createHmac } from 'node:crypto'

import { serviceRequest } from './httpClient'

const MQ_SERVICE_HOST = process.env.HT_RABBITMQ_SERVICE ?? 'http://ht-rabbit-mq:3000'
const MQ_SEND_PATH = '/ht_rabbit_mq/send'

export type MqParam = Record<string, unknown> | null | undefined
export type MqLogger = { info: (...args: unknown[]) => void }

function base64UrlEncode(value: string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function createMqServiceJwt(): string {
  const uid = process.env.API_USER?.trim()
  if (!uid) {
    throw new Error('SendMqMessage: API_USER 未配置')
  }

  const secret = process.env.JWT_SECRET ?? 'change_me'
  const now = Math.floor(Date.now() / 1000)
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64UrlEncode(JSON.stringify({ uid, iat: now, exp: now + 60 * 60 }))
  const unsignedToken = `${header}.${payload}`
  const signature = createHmac('sha256', secret)
    .update(unsignedToken)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')

  return `${unsignedToken}.${signature}`
}

/**
 * 向 ht-rabbit-mq 服务发送消息，topic 不能为空，param 应为对象。
 * 实际请求体为：{ topic, param: { ... } }
 */
export async function SendMqMessage(
  topic: string,
  param: MqParam = {},
  logger: MqLogger
): Promise<Response> {
  if (!topic || !topic.trim()) {
    throw new Error('SendMqMessage: topic 不能为空')
  }

  const jwtStr = createMqServiceJwt()
  logger.info({ topic, param, jwtStr }, 'SendMqMessage debug')

  const url = `${MQ_SERVICE_HOST.replace(/\/+$/, '')}${MQ_SEND_PATH}`
  const response = await serviceRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwtStr}`,
    },
    body: JSON.stringify({ topic, param: param ?? {} }),
  })

  if (!response.ok) {
    throw new Error(`SendMqMessage: ht-rabbit-mq 服务响应异常 status=${response.status}`)
  }

  return response
}

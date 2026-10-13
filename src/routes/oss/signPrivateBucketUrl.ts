import { type FastifyReply, type FastifyRequest, type FastifyInstance } from 'fastify'
import OSS from 'ali-oss'

// 签名 URL 有效期（秒）：客户端拿到后立即加载图片，10 分钟足够
const SIGN_URL_EXPIRES_SECONDS = 600

type SignConfig = {
  accessKeyId: string
  accessKeySecret: string
  bucket: string
  region: string
  customDomain: string | null
}

// 返回给客户端的签名结果：url 可直接用于 <img> / 浏览器访问私有 Bucket 内的对象
export type SignPrivateUrlResponse = {
  url: string
  expiresAt: string
}

// 从环境变量读取 OSS 配置，缺任何一项视为未配置（与 stsViews 共用同一组凭据）
function loadSignConfig (): SignConfig | null {
  const accessKeyId = process.env.ALIYUN_CLIENT_OSS_ACCESS_KEY_ID
  const accessKeySecret = process.env.ALIYUN_CLIENT_OSS_ACCESS_KEY_SECRET
  const bucket = process.env.ALIYUN_OSS_BUCKET
  const region = process.env.ALIYUN_OSS_REGION
  // 自定义域名（CNAME 到 Bucket），如 https://uimg.ai100.me；未配置则返回 OSS 默认域名
  const customDomain = process.env.ALIYUN_OSS_CUSTOM_DOMAIN

  if (accessKeyId == null || accessKeyId === '' ||
    accessKeySecret == null || accessKeySecret === '' ||
    bucket == null || bucket === '' ||
    region == null || region === '') {
    return null
  }

  return {
    accessKeyId,
    accessKeySecret,
    bucket,
    region,
    customDomain: customDomain != null && customDomain.trim() !== '' ? customDomain.trim().replace(/\/+$/, '') : null
  }
}

// OSS 签名只与对象路径和参数有关，与 host 无关，因此直接替换源站域名为自定义域名即可
function replaceWithCustomDomain (signedUrl: string, customDomain: string | null): string {
  if (customDomain == null) {
    return signedUrl
  }
  try {
    const parsed = new URL(signedUrl)
    return `${customDomain}${parsed.pathname}${parsed.search}`
  } catch {
    return signedUrl
  }
}

// path 必须是 Bucket 内的相对对象键，拒绝绝对路径和目录穿越
function normalizeObjectPath (value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const path = value.trim()
  if (path === '' || path.startsWith('/') || path.includes('..') || path.includes('\\')) {
    return null
  }
  return path
}

// 为私有 Bucket 内的对象生成签名访问 URL
/**
 * 请求:
 * POST /oss/sign_prv_url
 * {
 *   "path": "mathink/feedback/20261011_17_01_25sJ1wVUTP.jpg"
 * }
 *
 * 成功返回（配置了 ALIYUN_OSS_CUSTOM_DOMAIN 时）:
 * {
 *   "url": "https://uimg.ai100.me/mathink/feedback/20261011_17_01_25sJ1wVUTP.jpg?OSSAccessKeyId=xxx&Expires=xxx&Signature=xxx",
 *   "expiresAt": "2026-10-11T09:10:00.000Z"
 * }
 *
 * 失败返回:
 * {
 *   "error": "user not found"
 * }
 */
const signPrivateBucketUrl = async function (
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<SignPrivateUrlResponse | never> {
  const uid = request.user?.uid
  if (typeof uid !== 'string' || uid.trim() === '') {
    return reply.unauthorized('user not found') as never
  }

  const body = request.body as { path?: unknown } | null | undefined
  const path = normalizeObjectPath(body?.path)
  if (path == null) {
    return reply.badRequest('invalid path') as never
  }

  const config = loadSignConfig()
  if (config == null) {
    this.log.error('oss sign env config missing (ALIYUN_CLIENT_OSS_ACCESS_KEY_ID / ALIYUN_CLIENT_OSS_ACCESS_KEY_SECRET / ALIYUN_OSS_BUCKET / ALIYUN_OSS_REGION)')
    return reply.internalServerError('oss sign not configured') as never
  }

  try {
    const client = new OSS({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      bucket: config.bucket,
      region: config.region
    })

    const url = replaceWithCustomDomain(
      client.signatureUrl(path, { expires: SIGN_URL_EXPIRES_SECONDS }),
      config.customDomain
    )
    return {
      url,
      expiresAt: new Date(Date.now() + SIGN_URL_EXPIRES_SECONDS * 1000).toISOString()
    }
  } catch (err) {
    this.log.error({ err }, 'sign private oss url failed')
    return reply.internalServerError('sign private oss url failed') as never
  }
}

export default signPrivateBucketUrl

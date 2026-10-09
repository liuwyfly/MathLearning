import { type FastifyReply, type FastifyRequest, type FastifyInstance } from 'fastify'
import OSS from 'ali-oss'

// STS 临时凭证有效期（秒）：一次反馈最多上传 3 张截图，15 分钟足够
const STS_EXPIRATION_SECONDS = 900

// 反馈截图在 Bucket 内的目录前缀，需与 Android 端 OssUploadManager.FEEDBACK_DIR 保持一致
const FEEDBACK_DIR = 'mathink/feedback'

type StsConfig = {
  accessKeyId: string
  accessKeySecret: string
  roleArn: string
  bucket: string
  endpoint: string
}

// 返回给客户端的 STS 临时凭证，字段与阿里云 STS AssumeRole 返回结构一致，
// 额外附带 bucket / endpoint，客户端无需硬编码
export type OssStsTokenResponse = {
  AccessKeyId: string
  AccessKeySecret: string
  SecurityToken: string
  Expiration: string
  bucket: string
  endpoint: string
}

// 从环境变量读取 OSS STS 配置，缺任何一项视为未配置
function loadStsConfig (): StsConfig | null {
  const accessKeyId = process.env.ALIYUN_CLIENT_OSS_ACCESS_KEY_ID
  const accessKeySecret = process.env.ALIYUN_CLIENT_OSS_ACCESS_KEY_SECRET
  const roleArn = process.env.ALIYUN_OSS_ROLE_ARN
  const bucket = process.env.ALIYUN_OSS_BUCKET
  const region = process.env.ALIYUN_OSS_REGION

  if (accessKeyId == null || accessKeyId === '' ||
    accessKeySecret == null || accessKeySecret === '' ||
    roleArn == null || roleArn === '' ||
    bucket == null || bucket === '' ||
    region == null || region === '') {
    return null
  }

  return {
    accessKeyId,
    accessKeySecret,
    roleArn,
    bucket,
    endpoint: `https://${region}.aliyuncs.com`
  }
}

// 获取 OSS STS 临时凭证
/**
 * 成功返回:
 * {
 *   "AccessKeyId": "STS.xxx",
 *   "AccessKeySecret": "xxx",
 *   "SecurityToken": "xxx",
 *   "Expiration": "2026-10-08T18:00:00Z",
 *   "bucket": "your-bucket",
 *   "endpoint": "https://oss-cn-hangzhou.aliyuncs.com"
 * }
 *
 * 失败返回:
 * {
 *   "error": "user not found"
 * }
 */
export const GetOssStsToken = async function (
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<OssStsTokenResponse | never> {
  const uid = request.user?.uid
  if (typeof uid !== 'string' || uid.trim() === '') {
    return reply.unauthorized('user not found') as never
  }

  const config = loadStsConfig()
  if (config == null) {
    this.log.error('oss sts env config missing (ALIYUN_ACCESS_KEY_ID / ALIYUN_ACCESS_KEY_SECRET / ALIYUN_OSS_ROLE_ARN / ALIYUN_OSS_BUCKET / ALIYUN_OSS_REGION)')
    return reply.internalServerError('oss sts not configured') as never
  }

  // 最小权限：只允许往 mathink/feedback/ 前缀下 PutObject
  const policy = {
    Version: '1',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['oss:PutObject'],
        Resource: [`acs:oss:*:*:${config.bucket}/${FEEDBACK_DIR}/*`]
      }
    ]
  }

  try {
    const sts = new OSS.STS({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret
    })
    const result = await sts.assumeRole(
      config.roleArn,
      policy,
      STS_EXPIRATION_SECONDS,
      `mathink-${uid}`
    )

    return {
      AccessKeyId: result.credentials.AccessKeyId,
      AccessKeySecret: result.credentials.AccessKeySecret,
      SecurityToken: result.credentials.SecurityToken,
      Expiration: result.credentials.Expiration,
      bucket: config.bucket,
      endpoint: config.endpoint
    }
  } catch (err) {
    this.log.error({ err }, 'assume oss sts role failed')
    return reply.internalServerError('get oss sts token failed') as never
  }
}

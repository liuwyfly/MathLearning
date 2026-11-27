import {
  type FastifyInstance,
  type FastifyPluginAsync,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify'
import OSS from 'ali-oss'
import { AuthorizeByRole } from '../../../common/auth'
import { ROLE_CONTENT_ADMIN } from '../../../common/constants'

const STS_EXPIRATION_SECONDS = 900
const DEFAULT_BUCKET = 'turbo2016'

type AdminOssStsQuery = {
  article_id?: string
}

type StsConfig = {
  accessKeyId: string
  accessKeySecret: string
  roleArn: string
  bucket: string
  region: string
}

function loadStsConfig (): StsConfig | null {
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET
  const roleArn = process.env.OSS_ARTICLE_IMG_ROLE_ARN
  const bucket = process.env.OSS_ADMIN_BUCKET?.trim() || DEFAULT_BUCKET
  const region = process.env.OSS_REGION

  if (
    accessKeyId == null || accessKeyId === '' ||
    accessKeySecret == null || accessKeySecret === '' ||
    roleArn == null || roleArn === '' ||
    bucket === '' ||
    region == null || region === ''
  ) {
    return null
  }

  return { accessKeyId, accessKeySecret, roleArn, bucket, region }
}

function normalizePrefix (value: string | null | undefined): string {
  if (value == null) {
    return ''
  }
  return value.trim().replace(/^\/+/, '').replace(/\/+$/, '')
}

const getAdminOssSts = async function (
  this: FastifyInstance,
  request: FastifyRequest<{ Querystring: AdminOssStsQuery }>,
  reply: FastifyReply
) {
  // 管理端接口必须校验内容管理员角色
  await AuthorizeByRole(this, request, [ROLE_CONTENT_ADMIN])

  const articleId = Number(request.query.article_id)
  if (!Number.isInteger(articleId) || articleId <= 0) {
    return reply.badRequest('invalid article_id') as never
  }

  const config = loadStsConfig()
  if (config == null) {
    this.log.error(
      'admin oss sts config missing: OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET / OSS_ARTICLE_IMG_ROLE_ARN / OSS_REGION'
    )
    return reply.internalServerError('admin oss sts not configured') as never
  }

  // 上传目录由 article_id 反查，不允许客户端自带 prefix
  const rows = await this.prisma.$queryRaw<{ oss_path: string | null }[]>`
    SELECT c.oss_path
    FROM \`mathlearning_article\` a
    JOIN mathlearning_contents_articles ca ON ca.article_id = a.id
    JOIN mathlearning_contents c ON c.id = ca.contents_id
    WHERE a.id = ${articleId}
    ORDER BY ca.id ASC
    LIMIT 1
  `

  if (rows.length === 0) {
    return reply.notFound('article not found') as never
  }

  const basePath = normalizePrefix(rows[0].oss_path)
  const prefix = basePath === '' ? `article-images/${articleId}` : `${basePath}/images`

  // 内联 policy 再限制一次：只允许写这篇文章的 images 目录
  const policy = {
    Version: '1',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['oss:PutObject'],
        Resource: [`acs:oss:*:*:turbo2016/mathlearning/*`],
      },
    ],
  }

  const uid = (request.user as { uid?: string | number } | undefined)?.uid
  const sessionName = `admin-${String(uid ?? articleId)}`
    .replace(/[^A-Za-z0-9+=,.@_-]/g, '_')
    .slice(0, 64)

  try {
    const sts = new OSS.STS({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
    })

    const result = await sts.assumeRole(
      config.roleArn,
      policy,
      STS_EXPIRATION_SECONDS,
      sessionName
    )

    return {
      AccessKeyId: result.credentials.AccessKeyId,
      AccessKeySecret: result.credentials.AccessKeySecret,
      SecurityToken: result.credentials.SecurityToken,
      Expiration: result.credentials.Expiration,
      bucket: config.bucket,
      region: config.region,
      endpoint: `https://${config.bucket}.${config.region}.aliyuncs.com`,
      prefix,
    }
  } catch (err) {
    this.log.error({ err }, 'assume admin oss sts role failed')
    return reply.internalServerError('get admin oss sts token failed') as never
  }
}

// autoload 会把目录名作为路由前缀，这里最终路径是 /admin/oss/sts
const adminOss: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get<{ Querystring: AdminOssStsQuery }>(
    '/sts',
    {
      onRequest: [fastify.authenticate],
      schema: {
        querystring: {
          type: 'object',
          required: ['article_id'],
          properties: {
            article_id: { type: 'string', pattern: '^[1-9]\\d*$' },
          },
          additionalProperties: false,
        },
      },
    },
    getAdminOssSts
  )
}

export default adminOss

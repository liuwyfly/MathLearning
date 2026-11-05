import { type FastifyReply, type FastifyRequest, type FastifyInstance } from 'fastify'
import { COMPLAINT_DAILY_LIMIT, COMPLAINT_STATUS_PROCESSING, COMPLAINT_STATUS_WAITING_FOR } from '../../common/constants'
import { pagination } from '../../common/pagination'
import { prismaLocalNow } from '../../common/timeUtil'

type ComplaintRow = {
  id: number
  content: string
  status: string
  uid: string
  created_at: Date
  updated_at: Date
}

type ComplaintParams = {
  id: string
}

export type PostComplaintBody = {
  content: string
}

export type PutComplaintBody = {
  content: string
}

export type PatchComplaintBody = {
  content?: string
}

export const postComplaintBodySchema = {
  type: 'object',
  required: ['content'],
  properties: {
    content: {
      type: 'string',
      minLength: 1,
      errorMessage: { minLength: '投诉内容不能为空' }
    }
  },
  additionalProperties: false
} as const

export const putComplaintBodySchema = postComplaintBodySchema

export const patchComplaintBodySchema = {
  type: 'object',
  properties: {
    content: {
      type: 'string',
      minLength: 1,
      errorMessage: { minLength: '投诉内容不能为空' }
    }
  },
  additionalProperties: false
} as const

// 投诉图片信息：客户端相册原文件名、上传到 OSS 的文件名、OSS objectKey
export type PostComplaintImageItem = {
  original_name: string
  oss_filename: string
  oss_path: string
}

export type PostComplaintImagesBody = {
  images: PostComplaintImageItem[]
}

export const postComplaintImagesBodySchema = {
  type: 'object',
  required: ['images'],
  properties: {
    images: {
      type: 'array',
      minItems: 1,
      maxItems: 9,
      errorMessage: {
        minItems: 'images 不能为空',
        maxItems: 'images 一次最多 9 张'
      },
      items: {
        type: 'object',
        required: ['original_name', 'oss_filename', 'oss_path'],
        properties: {
          original_name: { type: 'string', minLength: 1, maxLength: 255 },
          oss_filename: { type: 'string', minLength: 1, maxLength: 128 },
          oss_path: { type: 'string', minLength: 1, maxLength: 352 }
        },
        additionalProperties: false,
        errorMessage: {
          required: {
            original_name: 'original_name 不能为空',
            oss_filename: 'oss_filename 不能为空',
            oss_path: 'oss_path 不能为空'
          }
        }
      }
    }
  },
  additionalProperties: false
} as const

function parseComplaintId (id: string): number | null {
  const parsed = Number(id)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

// 根据 JWT 中的 uid 查询用户数字 id
async function resolveUserId (_fastify: FastifyInstance, request: FastifyRequest): Promise<string | null> {
  const uid = (request.user as Record<string, unknown> | undefined)?.uid
  if (typeof uid !== 'string' || uid.trim() === '') {
    return null
  }

  return uid
}

// 列表摘要的最大长度（字符数）
const COMPLAINT_SUMMARY_MAX_LENGTH = 100

// 生成列表摘要：换行/回车/制表符等连续空白折叠为单个空格（摘要是两行内展示，换行没有排版意义），
// 超出 100 字截断并补省略号；完整内容（含换行）由详情接口返回
function buildComplaintSummary (content: string): { summary: string, truncated: boolean } {
  const flattened = content.trim().replace(/\s+/g, ' ')
  if (flattened.length <= COMPLAINT_SUMMARY_MAX_LENGTH) {
    return { summary: flattened, truncated: false }
  }
  return {
    summary: `${flattened.slice(0, COMPLAINT_SUMMARY_MAX_LENGTH)}…`,
    truncated: true
  }
}

// 投诉列表分页响应
type ComplaintListResponse = {
  data: Array<ComplaintRow & { content_truncated: boolean }>
  total: number
  page: number
  page_size: number
}

// 获取当前用户的投诉列表（分页）
// 查询参数：page（从 1 开始，默认 1）、page_size（默认 10，最大 100）
// content 只返回前 100 字摘要（换行已折叠为空格），content_truncated 标记是否被截断，
// 完整内容请走 GET /:id 详情接口
export const GetComplaints = async function (
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<ComplaintListResponse | never> {
  try {
    const userId = await resolveUserId(this, request)
    if (userId == null) {
      return reply.unauthorized('user not found') as never
    }

    const { page: p, page_size: ps } = pagination(request)

    const where = { uid: userId }
    const [total, rows] = await Promise.all([
      this.prisma.complaint.count({ where }),
      this.prisma.complaint.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (p - 1) * ps,
        take: ps
      })
    ])

    return {
      data: rows.map((row) => {
        const { summary, truncated } = buildComplaintSummary(row.content)
        return { ...row, content: summary, content_truncated: truncated }
      }),
      total,
      page: p,
      page_size: ps
    }
  } catch (err) {
    this.log.error({ err }, 'query complaint list failed')
    return reply.internalServerError('query complaint failed') as never
  }
}

// 投诉详情：基础信息 + 截图列表 + 客服回复列表
type ComplaintDetailRow = ComplaintRow & {
  images: ComplaintImageRow[]
  replies: ComplaintReplyRow[]
}

type ComplaintReplyRow = {
  id: number
  complaint_id: number
  content: string
  created_at: Date
  updated_at: Date
}

// 获取当前用户的单条投诉详情（仅限本人），包含截图与客服回复
/**
 * 成功返回:
 * {
 *   "data": {
 *     "id": 2,
 *     "content": "我反馈一下题目第3题答案解析有误，请核对。",
 *     "status": "REPLIED",
 *     "uid": "420a8fc872644180b78ef1347a2c633c",
 *     "created_at": "2026-10-08T17:35:38.336Z",
 *     "updated_at": "2026-10-08T17:35:38.336Z",
 *     "images": [
 *       {
 *         "id": 1,
 *         "path": "mathink/feedback/20260625_123_01.jpg",
 *         "original_name": "IMG_20260625_143022.jpg",
 *         "filename": "20260625_123_01.jpg",
 *         "complaint_id": 2,
 *         "created_at": "2026-10-10T21:35:38.336Z",
 *         "updated_at": "2026-10-10T21:35:38.336Z"
 *       }
 *     ],
 *     "replies": [
 *       {
 *         "id": 1,
 *         "complaint_id": 2,
 *         "content": "已核对，第3题解析已修正。",
 *         "created_at": "2026-10-11T09:00:00.000Z",
 *         "updated_at": "2026-10-11T09:00:00.000Z"
 *       }
 *     ]
 *   }
 * }
 *
 * 失败返回:
 * {
 *   "error": "complaint not found"
 * }
 */
export const GetComplaintDetail = async function (
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ data: ComplaintDetailRow } | never> {
  const id = parseComplaintId((request.params as ComplaintParams).id)
  if (id == null) {
    return reply.badRequest('id must be a positive integer') as never
  }

  try {
    const userId = await resolveUserId(this, request)
    if (userId == null) {
      return reply.unauthorized('user not found') as never
    }

    // 只允许查看本人的投诉详情
    const complaint = await this.prisma.complaint.findFirst({
      where: { id, uid: userId }
    })
    if (complaint == null) {
      return reply.notFound('complaint not found') as never
    }

    const images = await this.prisma.complaintImage.findMany({
      where: { complaint_id: id },
      orderBy: { id: 'asc' }
    })

    // 客服回复按时间升序返回，不下发 admin_uid
    const replies = await this.prisma.complaintReply.findMany({
      where: { complaint_id: id },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        complaint_id: true,
        content: true,
        created_at: true,
        updated_at: true
      }
    })

    return { data: { ...complaint, images, replies } }
  } catch (err) {
    this.log.error({ err, id }, 'query complaint detail failed')
    return reply.internalServerError('query complaint detail failed') as never
  }
}

// 新建投诉
/**
 * 请求参数:
 * {
 *   "content": "我反馈一下题目第3题答案解析有误，请核对。"
 * }

 * 成功返回:
 * {
    "id": 2,
    "content": "我反馈一下题目第3题答案解析有误，请核对。",
    "status": "WAITING_FOR",
    "uid": "420a8fc872644180b78ef1347a2c633c",
    "created_at": "2026-10-08T17:35:38.336Z",
    "updated_at": "2026-10-08T17:35:38.336Z"
  }
 
 * 失败返回:
 * {
 *   "error": "user not found"
 * }
 */
export const PostComplaint = async function (
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<ComplaintRow | never> {
  const { content } = request.body as PostComplaintBody
  if (typeof content !== 'string' || content.trim() === '') {
    return reply.badRequest('content is required') as never
  }

  const uid = request.user?.uid
  this.log.info({ uid, content }, 'creating new complaint')

  try {
    const userId = await resolveUserId(this, request)
    if (userId == null) {
      return reply.unauthorized('user not found') as never
    }

    const now = prismaLocalNow()

    // 每人每天最多提交 COMPLAINT_DAILY_LIMIT 条投诉/反馈
    // created_at 按 prismaLocalNow 的本地时钟面补偿存储，dayStart 做同样补偿以对齐
    const realNow = new Date()
    const offset = realNow.getTimezoneOffset() * 60000
    const localMidnight = new Date(realNow.getFullYear(), realNow.getMonth(), realNow.getDate())
    const dayStart = new Date(localMidnight.getTime() - offset)
    this.log.info({ userId, dayStart }, 'checking daily complaint limit')

    const todayCount = await this.prisma.complaint.count({
      where: {
        uid: userId,
        created_at: { gte: dayStart }
      }
    })
    if (todayCount >= COMPLAINT_DAILY_LIMIT) {
      return reply.code(429).send({
        error: `已达到每天提交的上限 Daily limit reached (${COMPLAINT_DAILY_LIMIT} per day)`,
        code: 'COMPLAINT_DAILY_LIMIT_REACHED'
      }) as never
    }

    const createdRow = await this.prisma.complaint.create({
      data: {
        content: content.trim(),
        status: COMPLAINT_STATUS_WAITING_FOR,
        uid: userId,
        created_at: now,
        updated_at: now
      }
    })

    reply.code(201)
    return createdRow
  } catch (err) {
    this.log.error({ err }, 'insert complaint failed')
    return reply.internalServerError('create complaint failed') as never
  }
}

// 全量更新投诉（仅限本人）
export const PutComplaint = async function (
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<ComplaintRow | never> {
  const id = parseComplaintId((request.params as ComplaintParams).id)
  if (id == null) {
    return reply.badRequest('id must be a positive integer') as never
  }

  const { content } = request.body as PutComplaintBody
  if (typeof content !== 'string' || content.trim() === '') {
    return reply.badRequest('content is required') as never
  }

  try {
    const userId = await resolveUserId(this, request)
    if (userId == null) {
      return reply.unauthorized('user not found') as never
    }

    const existedComplaint = await this.prisma.complaint.findFirst({
      where: { id, uid: userId }
    })
    if (existedComplaint == null) {
      return reply.notFound('complaint not found') as never
    }
    const existedStatus = (existedComplaint as { status?: string }).status
    if (existedStatus === COMPLAINT_STATUS_PROCESSING) {
      return reply.forbidden('complaint is processing, cannot modify') as never
    }

    const updateResult = await this.prisma.complaint.updateMany({
      where: { id, uid: userId },
      data: {
        content: content.trim(),
        updated_at: prismaLocalNow()
      }
    })

    if (updateResult.count === 0) {
      return reply.notFound('complaint not found') as never
    }

    const updatedRow = await this.prisma.complaint.findUnique({
      where: { id }
    })

    if (updatedRow == null) {
      return reply.internalServerError('query updated complaint failed') as never
    }

    return updatedRow
  } catch (err) {
    this.log.error({ err, id }, 'update complaint failed')
    return reply.internalServerError('update complaint failed') as never
  }
}

// 部分更新投诉（仅限本人）
export const PatchComplaint = async function (
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<ComplaintRow | never> {
  const id = parseComplaintId((request.params as ComplaintParams).id)
  if (id == null) {
    return reply.badRequest('id must be a positive integer') as never
  }

  const { content } = request.body as PatchComplaintBody
  if (content != null && (typeof content !== 'string' || content.trim() === '')) {
    return reply.badRequest('content must be a non-empty string') as never
  }

  try {
    const userId = await resolveUserId(this, request)
    if (userId == null) {
      return reply.unauthorized('user not found') as never
    }

    const existedComplaint = await this.prisma.complaint.findFirst({
      where: { id, uid: userId }
    })
    if (existedComplaint == null) {
      return reply.notFound('complaint not found') as never
    }
    const existedStatus = (existedComplaint as { status?: string }).status
    if (existedStatus === COMPLAINT_STATUS_PROCESSING) {
      return reply.forbidden('complaint is processing, cannot modify') as never
    }

    const data: { content?: string, updated_at: Date } = {
      updated_at: prismaLocalNow()
    }
    if (typeof content === 'string') {
      data.content = content.trim()
    }

    const updateResult = await this.prisma.complaint.updateMany({
      where: { id, uid: userId },
      data
    })

    if (updateResult.count === 0) {
      return reply.notFound('complaint not found') as never
    }

    const updatedRow = await this.prisma.complaint.findUnique({
      where: { id }
    })

    if (updatedRow == null) {
      return reply.internalServerError('query updated complaint failed') as never
    }

    return updatedRow
  } catch (err) {
    this.log.error({ err, id }, 'patch complaint failed')
    return reply.internalServerError('update complaint failed') as never
  }
}

// 举报与反馈，记录图片
/**
 * 请求参数:
 * {
 *   "images": [
 *     {
 *       "original_name": "IMG_20260625_143022.jpg",
 *       "oss_filename": "20260625_123_01.jpg",
 *       "oss_path": "mathink/feedback/20260625_123_01.jpg"
 *     }
 *   ]
 * }
 *
 * 成功返回（201）:
 * {
 *   "data": [
 *     {
 *       "id": 1,
 *       "path": "mathink/feedback/20260625_123_01.jpg",
 *       "original_name": "IMG_20260625_143022.jpg",
 *       "filename": "20260625_123_01.jpg",
 *       "complaint_id": 123,
 *       "created_at": "2026-10-10T21:35:38.336Z",
 *       "updated_at": "2026-10-10T21:35:38.336Z"
 *     }
 *   ]
 * }
 *
 * 失败返回:
 * {
 *   "error": "complaint not found"
 * }
 */
type ComplaintImageRow = {
  id: number
  path: string
  original_name: string
  filename: string
  complaint_id: number
  created_at: Date
  updated_at: Date
}

export const PostComplaintImages = async function (
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ data: ComplaintImageRow[] } | never> {
  const id = parseComplaintId((request.params as ComplaintParams).id)
  if (id == null) {
    return reply.badRequest('id must be a positive integer') as never
  }

  const { images } = request.body as PostComplaintImagesBody

  try {
    const userId = await resolveUserId(this, request)
    if (userId == null) {
      return reply.unauthorized('user not found') as never
    }

    // 只允许给本人的投诉追加图片
    const existedComplaint = await this.prisma.complaint.findFirst({
      where: { id, uid: userId }
    })
    if (existedComplaint == null) {
      return reply.notFound('complaint not found') as never
    }

    const now = prismaLocalNow()
    await this.prisma.complaintImage.createMany({
      data: images.map((image) => ({
        complaint_id: id,
        path: image.oss_path.trim(),
        original_name: image.original_name.trim(),
        filename: image.oss_filename.trim(),
        created_at: now,
        updated_at: now
      }))
    })

    const rows = await this.prisma.complaintImage.findMany({
      where: { complaint_id: id },
      orderBy: { id: 'asc' }
    })

    reply.code(201)
    return { data: rows }
  } catch (err) {
    this.log.error({ err, id }, 'save complaint images failed')
    return reply.internalServerError('save complaint images failed') as never
  }
}

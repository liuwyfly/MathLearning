import { type FastifyReply, type FastifyRequest, type FastifyInstance } from 'fastify'
import { AuthorizeByRole } from '../../../common/auth'
import { ROLE_CONTENT_ADMIN } from '../../../common/constants'
import {
  COMPLAINT_STATUS_PROCESSING,
  COMPLAINT_STATUS_REPLIED,
  COMPLAINT_STATUS_USER_CLOSED,
  COMPLAINT_STATUS_WAITING_FOR
} from '../../../common/constants'
import { prismaLocalNow } from '../../../common/timeUtil'

type AdminComplaintRow = {
  id: number
  content: string
  status: string
  uid: string
  created_at: Date
  updated_at: Date
}

export type AdminComplaintListQuery = {
  status?: string
  page?: number
  page_size?: number
}

export const adminComplaintListQuerySchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: [
        COMPLAINT_STATUS_WAITING_FOR,
        COMPLAINT_STATUS_PROCESSING,
        COMPLAINT_STATUS_REPLIED,
        COMPLAINT_STATUS_USER_CLOSED
      ]
    },
    page: {
      type: 'integer',
      minimum: 1,
      default: 1
    },
    page_size: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      default: 20,
      errorMessage: {
        maximum: 'page_size 最大为 100'
      }
    }
  },
  additionalProperties: false
} as const

// 管理员获取所有用户的投诉列表，可按 status 过滤，分页返回（不查总记录数）
export const GetAdminComplaints = async function (
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ data: AdminComplaintRow[], page: number, page_size: number } | never> {
  // 验证角色
  await AuthorizeByRole(this, request, [ROLE_CONTENT_ADMIN]);
  const { status, page = 1, page_size: pageSize = 20 } = request.query as AdminComplaintListQuery

  try {
    const rows = await this.prisma.complaint.findMany({
      where: typeof status === 'string' && status !== '' ? { status } : {},
      orderBy: { id: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    })

    return { data: rows, page, page_size: pageSize }
  } catch (err) {
    this.log.error({ err }, 'query admin complaint list failed')
    return reply.internalServerError('query complaint failed') as never
  }
}

export type AdminComplaintParams = {
  id: string
}

export const adminComplaintIdParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', pattern: '^[1-9]\\d*$' }
  },
  additionalProperties: false
} as const

type AdminComplaintImageRow = {
  id: number
  path: string
  original_name: string
  filename: string
  complaint_id: number
  created_at: Date
  updated_at: Date
}

export type AdminComplaintDetailRow = AdminComplaintRow & {
  complaintImages: AdminComplaintImageRow[]
  complaintReplies: AdminComplaintReplyRow[]
}

// 管理员获取单条投诉详情，包含关联的投诉图片
export const GetAdminComplaintDetail = async function (
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AdminComplaintDetailRow | never> {
  // 验证角色
  await AuthorizeByRole(this, request, [ROLE_CONTENT_ADMIN]);
  const id = Number((request.params as AdminComplaintParams).id)

  try {
    const row = await this.prisma.complaint.findUnique({
      where: { id },
      include: {
        complaintImages: { orderBy: { id: 'asc' } },
        complaintReplies: { orderBy: { id: 'asc' } }
      }
    })
    if (row == null) {
      return reply.notFound('complaint not found') as never
    }

    return row
  } catch (err) {
    this.log.error({ err, id }, 'query admin complaint detail failed')
    return reply.internalServerError('query complaint failed') as never
  }
}

export type PostAdminComplaintReplyBody = {
  content: string
}

export const postAdminComplaintReplyBodySchema = {
  type: 'object',
  required: ['content'],
  properties: {
    content: {
      type: 'string',
      minLength: 1,
      errorMessage: { minLength: '回复内容不能为空' }
    }
  },
  additionalProperties: false
} as const

type AdminComplaintReplyRow = {
  id: number
  complaint_id: number
  content: string
  admin_uid: string
  created_at: Date
  updated_at: Date
}

// 管理员回复投诉/反馈：写入回复记录，并把投诉状态更新为 REPLIED
/**
 * 请求参数:
 * {
 *   "content": "您好，第3题答案已核对并修正，感谢反馈。"
 * }
 *
 * 成功返回（201）:
 * {
 *   "id": 1,
 *   "complaint_id": 123,
 *   "content": "您好，第3题答案已核对并修正，感谢反馈。",
 *   "admin_uid": "420a8fc872644180b78ef1347a2c633c",
 *   "created_at": "2026-11-01T09:35:38.336Z",
 *   "updated_at": "2026-11-01T09:35:38.336Z"
 * }
 *
 * 失败返回:
 * {
 *   "error": "complaint not found"
 * }
 */
export const PostAdminComplaintReply = async function (
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AdminComplaintReplyRow | never> {
  // 验证角色
  await AuthorizeByRole(this, request, [ROLE_CONTENT_ADMIN]);

  const id = Number((request.params as AdminComplaintParams).id)
  const { content } = request.body as PostAdminComplaintReplyBody
  if (typeof content !== 'string' || content.trim() === '') {
    return reply.badRequest('content is required') as never
  }

  const adminUid = (request.user as Record<string, unknown> | undefined)?.uid
  if (typeof adminUid !== 'string' || adminUid.trim() === '') {
    return reply.unauthorized('admin user not found') as never
  }

  try {
    const existedComplaint = await this.prisma.complaint.findUnique({
      where: { id }
    })
    if (existedComplaint == null) {
      return reply.notFound('complaint not found') as never
    }

    const now = prismaLocalNow()
    const createdRow = await this.prisma.complaintReply.create({
      data: {
        complaint_id: id,
        content: content.trim(),
        admin_uid: adminUid,
        created_at: now,
        updated_at: now
      }
    })

    // 回复后把投诉状态置为已回复
    await this.prisma.complaint.update({
      where: { id },
      data: {
        status: COMPLAINT_STATUS_REPLIED,
        updated_at: now
      }
    })

    reply.code(201)
    return createdRow
  } catch (err) {
    this.log.error({ err, id }, 'create complaint reply failed')
    return reply.internalServerError('create complaint reply failed') as never
  }
}

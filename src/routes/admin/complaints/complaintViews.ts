import { type FastifyReply, type FastifyRequest, type FastifyInstance } from 'fastify'
import { AuthorizeByRole } from '../../../common/auth'
import { ROLE_CONTENT_ADMIN } from '../../../common/constants'
import {
  COMPLAINT_STATUS_PROCESSING,
  COMPLAINT_STATUS_REPLIED,
  COMPLAINT_STATUS_USER_CLOSED,
  COMPLAINT_STATUS_WAITING_FOR
} from '../../../common/constants'

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

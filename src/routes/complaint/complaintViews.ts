import { type FastifyReply, type FastifyRequest, type FastifyInstance } from 'fastify'
import { COMPLAINT_STATUS_PROCESSING, COMPLAINT_STATUS_WAITING_FOR } from '../../common/constants'
import { prismaLocalNow } from '../../common/timeUtil'

type ComplaintRow = {
  id: number
  content: string
  user_id: number
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

function parseComplaintId (id: string): number | null {
  const parsed = Number(id)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

// 根据 JWT 中的 uid 查询用户数字 id
async function resolveUserId (fastify: FastifyInstance, request: FastifyRequest): Promise<number | null> {
  const uid = (request.user as Record<string, unknown> | undefined)?.uid
  if (typeof uid !== 'string' || uid === '') {
    return null
  }

  const user = await fastify.prisma.user.findUnique({
    where: { uid }
  })

  return user?.id ?? null
}

// 获取当前用户的投诉列表
export const GetComplaints = async function (
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ data: ComplaintRow[] } | never> {
  try {
    const userId = await resolveUserId(this, request)
    if (userId == null) {
      return reply.unauthorized('user not found') as never
    }

    const rows = await this.prisma.complaint.findMany({
      where: { user_id: userId },
      orderBy: { id: 'desc' }
    })

    return { data: rows }
  } catch (err) {
    this.log.error({ err }, 'query complaint list failed')
    return reply.internalServerError('query complaint failed') as never
  }
}

// 新建投诉
export const PostComplaint = async function (
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<ComplaintRow | never> {
  const { content } = request.body as PostComplaintBody
  if (typeof content !== 'string' || content.trim() === '') {
    return reply.badRequest('content is required') as never
  }

  try {
    const userId = await resolveUserId(this, request)
    if (userId == null) {
      return reply.unauthorized('user not found') as never
    }

    const now = prismaLocalNow()
    const createdRow = await this.prisma.complaint.create({
      data: {
        content: content.trim(),
        status: COMPLAINT_STATUS_WAITING_FOR,
        user_id: userId,
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
      where: { id, user_id: userId }
    })
    if (existedComplaint == null) {
      return reply.notFound('complaint not found') as never
    }
    const existedStatus = (existedComplaint as { status?: string }).status
    if (existedStatus === COMPLAINT_STATUS_PROCESSING) {
      return reply.forbidden('complaint is processing, cannot modify') as never
    }

    const updateResult = await this.prisma.complaint.updateMany({
      where: { id, user_id: userId },
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
      where: { id, user_id: userId }
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
      where: { id, user_id: userId },
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

import { type FastifyReply, type FastifyRequest, type FastifyInstance } from 'fastify'
import { DELETE_ACCOUNT_STATUS_WAITING_FOR } from '../../common/constants'
import { prismaLocalNow } from '../../common/timeUtil'

export interface DeleteAccountBody {
  confirmed: boolean
}

type DeleteAccountRow = {
  id: number
  uid: string
  status: string
  created_at: Date
  updated_at: Date
}

export const deleteAccountBodySchema = {
  type: 'object',
  properties: {
    confirmed: { type: 'boolean' }
  },
  required: ['confirmed']
}

// 提交账号注销申请，记录当前登录用户的 uid
/**
 * 请求参数:
 * {
 *   "confirmed": true
 * }
 *
 * 成功返回（201）:
 * {
 *   "id": 1,
 *   "uid": "420a8fc872644180b78ef1347a2c633c",
 *   "status": "WAITING_FOR",
 *   "created_at": "2026-10-08T17:35:38.336Z",
 *   "updated_at": "2026-10-08T17:35:38.336Z"
 * }
 *
 * 失败返回:
 * {
 *   "error": "user not found"
 * }
 */
export const deleteAccountHandler = async function (
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<DeleteAccountRow | never> {
  const { confirmed } = request.body as DeleteAccountBody
  if (confirmed !== true) {
    return reply.badRequest('confirmed must be true') as never
  }

  const uid = request.user?.uid
  this.log.info({ uid }, 'creating delete account request')

  try {
    if (typeof uid !== 'string' || uid.trim() === '') {
      return reply.unauthorized('user not found') as never
    }

    const now = prismaLocalNow()
    const createdRow = await this.prisma.deleteAccount.create({
      data: {
        uid,
        status: DELETE_ACCOUNT_STATUS_WAITING_FOR,
        created_at: now,
        updated_at: now
      }
    })

    reply.code(201)
    return createdRow
  } catch (err) {
    this.log.error({ err }, 'insert delete account failed')
    return reply.internalServerError('create delete account request failed') as never
  }
}

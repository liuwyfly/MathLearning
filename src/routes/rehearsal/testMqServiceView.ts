import { type FastifyInstance, FastifyRequest, type FastifyReply } from 'fastify'

import { createMqServiceJwt } from '../../common/mqClient'
import { formatLocalDateTime } from '../../common/timeUtil'

export interface testMqServiceBody {
  routing_key: string,
  param?: Record<string, any>
}

export const testMqServiceBodySchema = {
  type: 'object',
  required: ['routing_key'],
  properties: {
    routing_key: { type: 'string', minLength: 1 },
    param: { type: 'object' }
  }
}

export async function testMqServicePost (
  this: FastifyInstance,
  request: FastifyRequest<{ Body: testMqServiceBody }>,
  reply: FastifyReply
): Promise<void> {

    const uid = process.env.API_USER ?? 'test-user'

    const token = this.jwt.sign(
        { uid },
        { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
    )
  
    const token_test = createMqServiceJwt()

    try {
      await this.sendMqMessage(
        'User.WechatSignin',
        {
          open_id: "",
          union_id: "",
          user_id: undefined,
          time: formatLocalDateTime(new Date()),
          client_ip: ""
        }
      )
    } catch (mqErr) {
      request.log.warn({ err: mqErr, ip: "" }, 'send login mq message failed')
    }

  return reply.send({
    'message': 'success',
    'token': token,
    'token_test': token_test
  })
}

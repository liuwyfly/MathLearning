import fp from 'fastify-plugin'

import { type MqParam, SendMqMessage } from '../common/mqClient'

export default fp(async (fastify) => {
  fastify.decorate('sendMqMessage', async function sendMqMessage (routingKey: string, param: MqParam = {}) {
    return SendMqMessage(routingKey, param, fastify.log)
  })
})

declare module 'fastify' {
  interface FastifyInstance {
    sendMqMessage(routingKey: string, param?: MqParam): Promise<Response>
  }
}
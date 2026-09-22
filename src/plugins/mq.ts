import fp from 'fastify-plugin'

import { type MqParam, SendMqMessage } from '../common/mqClient'

export default fp(async (fastify) => {
  fastify.decorate('sendMqMessage', async function sendMqMessage (topic: string, param: MqParam = {}) {
    return SendMqMessage(topic, param, fastify.log)
  })
})

declare module 'fastify' {
  interface FastifyInstance {
    sendMqMessage(topic: string, param?: MqParam): Promise<Response>
  }
}
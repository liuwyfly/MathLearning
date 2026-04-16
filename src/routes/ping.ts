import { type FastifyPluginAsync } from 'fastify'

const ping: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/ping', async function (request, reply) {
    let ret = { pong: true, message: "math-learning"}
    return ret
  })
}

export default ping

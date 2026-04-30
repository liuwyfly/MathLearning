import fp from 'fastify-plugin'
import multipart from '@fastify/multipart'

export default fp(async (fastify) => {
  void fastify.register(multipart, {
    attachFieldsToBody: false,
    limits: {
      fileSize: 2 * 1024 * 1024 // 2 MB
    }
  })
})

import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify'

// 用已有的 jwt token 换一个新的 token（要求旧 token 仍在有效期内）
export async function refreshTokenHandler (
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify()
  } catch {
    return reply.code(401).send({ error: 'Invalid or expired token' })
  }

  const { uid } = request.user

  const token = this.jwt.sign(
    { uid },
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
  )

  return reply.send({ token })
}

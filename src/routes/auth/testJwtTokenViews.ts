import { type FastifyReply, type FastifyRequest, type FastifyInstance } from 'fastify'

export interface TestJwtTokenBody {
    uid: string
}

export const testJwtTokenHandler = async function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply): Promise<{ uid: string; token: string }> {
    const { uid } = request.body as TestJwtTokenBody
    const token = this.jwt.sign(
        { uid }, 
        { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
    )
    return { uid, token }
}

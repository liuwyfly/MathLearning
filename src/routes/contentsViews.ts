import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

export type ContentRow = {
	id: number
	name: string
	name_en: string | null
}


// Fastify 调用 handler 时会把实例绑定到 this，所以你可以在 handler 内直接用 this
// 路由注册阶段只需要“函数引用”，不需要手动传 fastify/request/reply

export const GetContents = async function (this: FastifyInstance, _request: FastifyRequest, reply: FastifyReply): Promise<{ data: ContentRow[] } | never> {
	try {
		const rows = await this.prisma.contents.findMany({
			orderBy: [ 
				{sort: "asc"}, 
				{id: "desc"} 
			],
			select: { id: true, name: true, name_en: true }
		})
		return { data: rows }
	} catch (err) {
		this.log.error({ err }, 'query contents failed')
		return reply.internalServerError('query contents failed') as never
	}
}

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { type RowDataPacket } from 'mysql2/promise'

export type ContentRow = RowDataPacket & {
	id: number
	name: string
	name_en: string
}


// Fastify 调用 handler 时会把实例绑定到 this，所以你可以在 handler 内直接用 this
// 路由注册阶段只需要“函数引用”，不需要手动传 fastify/request/reply

export const GetContents = async function (this: FastifyInstance, _request: FastifyRequest, reply: FastifyReply): Promise<{ data: ContentRow[] } | never> {
	try {
		let ret = { data: [] as ContentRow[] }
		const [rows] = await this.mysql.query<ContentRow[]>(
			'SELECT id, name, name_en FROM mathlearning_contents ORDER BY id ASC'
		)
		ret.data = rows
		return ret
	} catch (err) {
		this.log.error({ err }, 'query mathlearning_contents failed')
		return reply.internalServerError('query contents failed') as never
	}
}

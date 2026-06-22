import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { LANGUAGE_LIST, LANGUAGE_EN_US } from '../common/constants'

export type ContentRow = {
	id: number
	name: string
}

export type GetContentsQuery = {
	language?: string
}

export const getContentsQuerySchema = {
	type: "object",
	properties: {
		language: { type: "string", enum: LANGUAGE_LIST }
	},
	additionalProperties: false
} as const


// Fastify 调用 handler 时会把实例绑定到 this，所以你可以在 handler 内直接用 this
// 路由注册阶段只需要"函数引用"，不需要手动传 fastify/request/reply

export const GetContents = async function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply): Promise<{ data: ContentRow[] } | never> {
	try {
		const { language } = request.query as GetContentsQuery

		const rows = await this.prisma.contents.findMany({
			orderBy: [
				{sort: "asc"},
				{id: "desc"}
			],
			select: { id: true, name: true, name_en: true }
		})

		const data: ContentRow[] = rows.map(row => ({
			id: row.id,
			name: language === LANGUAGE_EN_US ? (row.name_en ?? row.name) : row.name
		}))

		return { data }
	} catch (err) {
		this.log.error({ err }, 'query contents failed')
		return reply.internalServerError('query contents failed') as never
	}
}

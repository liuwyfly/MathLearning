import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { LANGUAGE_LIST, LANGUAGE_EN_US } from '../common/constants'

export type ContentRow = {
	id: number
	name: string
	icon_path: string | null
}

export type GetContentsQuery = {
	language?: string
}

type ContentsSelectRow = {
	id: number
	name: string
	name_en: string | null
	icon_path: string | null
	enabled: boolean
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

export const GetContents = async function (
	this: FastifyInstance,
	request: FastifyRequest,
	reply: FastifyReply
): Promise<{ data: ContentRow[] } | never> {
	try {
		const { language } = request.query as GetContentsQuery
		const prisma = (this as any).prisma as {
			contents: { findMany: (args: unknown) => Promise<ContentsSelectRow[]> }
		}

		const rows = await prisma.contents.findMany({
			where: { enabled: true },
			orderBy: [
				{sort: "asc"},
				{id: "desc"}
			],
			select: { id: true, name: true, name_en: true, icon_path: true, enabled: true }
		})

		const data: ContentRow[] = rows
			.filter((row: ContentsSelectRow) => row.enabled)
			.map((row: ContentsSelectRow) => ({
			id: row.id,
			name: language === LANGUAGE_EN_US ? (row.name_en ?? row.name) : row.name,
			icon_path: row.icon_path
		}))

		return { data }
	} catch (err) {
		this.log.error({ err }, 'query contents failed')
		return (reply as any).internalServerError('query contents failed') as never
	}
}

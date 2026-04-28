import { type FastifyPluginAsync } from 'fastify'
import { type RowDataPacket } from 'mysql2/promise'

type ContentRow = RowDataPacket & {
	id: number
	name: string
	name_en: string
}

const contents: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.get('/contents', async function (_request, reply): Promise<{ data: ContentRow[] } | never> {
		try {
			let ret = { data: [] as ContentRow[] }
			const [rows] = await fastify.mysql.query<ContentRow[]>(
				'SELECT id, name, name_en FROM mathlearning_contents ORDER BY id ASC'
			)
			ret.data = rows
			return ret
		} catch (err) {
			fastify.log.error({ err }, 'query mathlearning_contents failed')
			return reply.internalServerError('query contents failed') as never
		}
	})
}

export default contents

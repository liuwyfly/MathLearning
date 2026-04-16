import { type FastifyPluginAsync } from 'fastify'
import { type RowDataPacket } from 'mysql2/promise'

type ContentRow = RowDataPacket & {
	id: number
	name: string
	name_en: string
	created_at: string
	updated_at: string
}

const contents: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.get('/contents', async function (_request, reply): Promise<ContentRow[] | never> {
		try {
			const [rows] = await fastify.mysql.query<ContentRow[]>(
				'SELECT id, name, name_en, created_at, updated_at FROM mathlearning_contents ORDER BY id ASC'
			)
			return rows
		} catch (err) {
			fastify.log.error({ err }, 'query mathlearning_contents failed')
			return reply.internalServerError('query contents failed') as never
		}
	})
}

export default contents

import { type FastifyPluginAsync } from 'fastify'

type ContentRow = {
  id: number
  name: string
  name_en: string | null
  created_at: Date
  updated_at: Date
}

type ContentParams = {
  id: string
}

type ContentBody = {
  name?: unknown
  name_en?: unknown
}

type ContentListResponse = {
  data: ContentRow[]
}

function parseContentId (id: string): number | null {
  const parsed = Number(id)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

function normalizeNameEn (nameEn: unknown): string | null {
  if (nameEn == null) {
    return null
  }

  if (typeof nameEn !== 'string') {
    return null
  }

  return nameEn.trim()
}

const managementContents: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/contents', async function (_request, reply): Promise<ContentListResponse | never> {
    try {
      const rows = await fastify.prisma.mathlearning_contents.findMany({
        orderBy: { id: 'asc' }
      })

      return { data: rows }
    } catch (err) {
      fastify.log.error({ err }, 'query mathlearning_contents list failed')
      return reply.internalServerError('query contents failed') as never
    }
  })

  fastify.get<{ Params: ContentParams }>('/contents/:id', async function (request, reply): Promise<ContentRow | never> {
    const id = parseContentId(request.params.id)
    if (id == null) {
      return reply.badRequest('id must be a positive integer') as never
    }

    try {
      const row = await fastify.prisma.mathlearning_contents.findUnique({
        where: { id }
      })

      if (row == null) {
        return reply.notFound('content not found') as never
      }

      return row
    } catch (err) {
      fastify.log.error({ err, id }, 'query mathlearning_contents by id failed')
      return reply.internalServerError('query content failed') as never
    }
  })

  fastify.post<{ Body: ContentBody }>('/contents', {
    onRequest: [fastify.authenticate]
  }, async function (request, reply): Promise<ContentRow | never> {
    const uid = (request.user as Record<string, unknown> | undefined)?.uid
    fastify.log.info({ uid }, 'jwt decoded uid')

    const { name, name_en: nameEnRaw } = request.body
    if (typeof name !== 'string' || name.trim() === '') {
      return reply.badRequest('name is required') as never
    }

    if (nameEnRaw != null && typeof nameEnRaw !== 'string') {
      return reply.badRequest('name_en must be a string') as never
    }

    const normalizedName = name.trim()
    const normalizedNameEn = normalizeNameEn(nameEnRaw)

    try {
      const createdRow = await fastify.prisma.mathlearning_contents.create({
        data: {
          name: normalizedName,
          name_en: normalizedNameEn
        }
      })

      reply.code(201)
      return createdRow
    } catch (err) {
      fastify.log.error({ err }, 'insert mathlearning_contents failed')
      return reply.internalServerError('create content failed') as never
    }
  })

  fastify.put<{ Params: ContentParams, Body: ContentBody }>('/contents/:id', async function (request, reply): Promise<ContentRow | never> {
    const id = parseContentId(request.params.id)
    if (id == null) {
      return reply.badRequest('id must be a positive integer') as never
    }

    const { name, name_en: nameEnRaw } = request.body
    if (typeof name !== 'string' || name.trim() === '') {
      return reply.badRequest('name is required') as never
    }

    if (nameEnRaw != null && typeof nameEnRaw !== 'string') {
      return reply.badRequest('name_en must be a string') as never
    }

    const normalizedName = name.trim()
    const normalizedNameEn = normalizeNameEn(nameEnRaw)

    try {
      const updateResult = await fastify.prisma.mathlearning_contents.updateMany({
        where: { id },
        data: {
          name: normalizedName,
          name_en: normalizedNameEn
        }
      })

      if (updateResult.count === 0) {
        return reply.notFound('content not found') as never
      }

      const updatedRow = await fastify.prisma.mathlearning_contents.findUnique({
        where: { id }
      })

      if (updatedRow == null) {
        return reply.internalServerError('query updated content failed') as never
      }

      return updatedRow
    } catch (err) {
      fastify.log.error({ err, id }, 'update mathlearning_contents failed')
      return reply.internalServerError('update content failed') as never
    }
  })

  fastify.delete<{ Params: ContentParams }>('/contents/:id', async function (request, reply): Promise<void | never> {
    const id = parseContentId(request.params.id)
    if (id == null) {
      return reply.badRequest('id must be a positive integer') as never
    }

    try {
      const deleteResult = await fastify.prisma.mathlearning_contents.deleteMany({
        where: { id }
      })

      if (deleteResult.count === 0) {
        return reply.notFound('content not found') as never
      }

      reply.code(204)
      return reply.send()
    } catch (err) {
      fastify.log.error({ err, id }, 'delete mathlearning_contents failed')
      return reply.internalServerError('delete content failed') as never
    }
  })
}

export default managementContents

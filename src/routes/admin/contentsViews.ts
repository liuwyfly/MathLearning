import { type FastifyReply, FastifyRequest, FastifyInstance } from 'fastify'

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

export const GetContents= async function (this: FastifyInstance, _request: FastifyRequest, reply: FastifyReply): 
  Promise<{ data: ContentRow[] } | never> {
    try {
      const rows = await this.prisma.contents.findMany({
        orderBy: { id: 'asc' }
      })

      return { data: rows }
    } catch (err) {
      this.log.error({ err }, 'query contents list failed')
      return reply.internalServerError('query contents failed') as never
    }
}

export const GetContesDetail = async function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply):
  Promise<ContentRow | never> {
    const id = parseContentId((request.params as ContentParams).id)
    if (id == null) {
      return reply.badRequest('id must be a positive integer') as never
    }

    try {
      const row = await this.prisma.contents.findUnique({
        where: { id }
      })

      if (row == null) {
        return reply.notFound('content not found') as never
      }

      return row
    } catch (err) {
      this.log.error({ err, id }, 'query contents by id failed')
      return reply.internalServerError('query content failed') as never
    }
}


export const PostContent = async function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply): 
  Promise<ContentRow | never> {
  const uid = (request.user as Record<string, unknown> | undefined)?.uid
  this.log.info({ uid }, 'jwt decoded uid')

  const { name, name_en: nameEnRaw } = request.body as ContentBody
  if (typeof name !== 'string' || name.trim() === '') {
    return reply.badRequest('name is required') as never
  }

  if (nameEnRaw != null && typeof nameEnRaw !== 'string') {
    return reply.badRequest('name_en must be a string') as never
  }

  const normalizedName = name.trim()
  const normalizedNameEn = normalizeNameEn(nameEnRaw)

  try {
    const createdRow = await this.prisma.contents.create({
      data: {
        name: normalizedName,
        name_en: normalizedNameEn
      }
    })

    reply.code(201)
    return createdRow
  } catch (err) {
    this.log.error({ err }, 'insert contents failed')
    return reply.internalServerError('create content failed') as never
  }
}


export const PutContent = async function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply): Promise<ContentRow | never> {
  const id = parseContentId((request.params as ContentParams).id)
  if (id == null) {
    return reply.badRequest('id must be a positive integer') as never
  }

  const { name, name_en: nameEnRaw } = request.body as ContentBody
  if (typeof name !== 'string' || name.trim() === '') {
    return reply.badRequest('name is required') as never
  }

  if (nameEnRaw != null && typeof nameEnRaw !== 'string') {
    return reply.badRequest('name_en must be a string') as never
  }

  const normalizedName = name.trim()
  const normalizedNameEn = normalizeNameEn(nameEnRaw)

  try {
    const updateResult = await this.prisma.contents.updateMany({
      where: { id },
      data: {
        name: normalizedName,
        name_en: normalizedNameEn
      }
    })

    if (updateResult.count === 0) {
      return reply.notFound('content not found') as never
    }

    const updatedRow = await this.prisma.contents.findUnique({
      where: { id }
    })

    if (updatedRow == null) {
      return reply.internalServerError('query updated content failed') as never
    }

    return updatedRow
  } catch (err) {
    this.log.error({ err, id }, 'update contents failed')
    return reply.internalServerError('update content failed') as never
  }
}


export const DeleteContent = async function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply): Promise<void | never> {
  const id = parseContentId((request.params as ContentParams).id)
  if (id == null) {
    return reply.badRequest('id must be a positive integer') as never
  }

  try {
    const deleteResult = await this.prisma.contents.deleteMany({
      where: { id }
    })

    if (deleteResult.count === 0) {
      return reply.notFound('content not found') as never
    }

    reply.code(204)
    return reply.send()
  } catch (err) {
    this.log.error({ err, id }, 'delete contents failed')
    return reply.internalServerError('delete content failed') as never
  }
}

import { type MultipartFile } from '@fastify/multipart'
import { type FastifyPluginAsync, type FastifyRequest } from 'fastify'
import { type MultipartField } from '../../../common/multipart'
import { ParsePositiveIntegerField, ParsePositiveNumberField } from '../../../common/validation'

type MarkdownUploadPayload = {
  articleId: number
  sort: number
  filename: string
  fileBuffer: Buffer
}

async function parseMarkdownUpload (request: FastifyRequest): Promise<MarkdownUploadPayload | { errorMessage: string }> {
  let articleIdRaw: unknown
  let sortRaw: unknown
  let filename: string | undefined
  let fileBuffer: Buffer | undefined

  for await (const part of request.parts() as AsyncIterableIterator<MultipartFile | MultipartField>) {
    if ('file' in part) {
      if (part.fieldname === 'file') {
        filename = part.filename
        fileBuffer = await part.toBuffer()
      } else {
        await part.toBuffer()
      }

      continue
    }

    if (part.fieldname === 'article_id') {
      articleIdRaw = part.value
      continue
    }

    if (part.fieldname === 'sort') {
      sortRaw = part.value
    }
  }

  const articleId = ParsePositiveIntegerField(articleIdRaw)
  if (articleId == null) {
    return { errorMessage: 'article_id must be a positive integer' }
  }

  const sort = ParsePositiveNumberField(sortRaw)
  if (sort == null) {
    return { errorMessage: 'sort must be a positive number' }
  }

  if (fileBuffer == null) {
    return { errorMessage: 'file is required' }
  }

  if (filename == null || filename.trim() === '') {
    return { errorMessage: 'file filename is required' }
  }

  return {
    articleId,
    sort,
    filename,
    fileBuffer
  }
}


/*
 * 上传 markdown 文件到 OSS
 * url: POST /math-learning/management/articles/markdown
 */
const markdown: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.post('/markdown', async function (request, reply) {
    if (!request.isMultipart()) {
      return reply.status(415).send({
        statusCode: 415,
        error: 'Unsupported Media Type',
        message: 'Expected multipart/form-data'
      })
    }

    try {
      const upload = await parseMarkdownUpload(request)
      if ('errorMessage' in upload) {
        return reply.badRequest(upload.errorMessage)
      }

      // TODO: upload `upload.fileBuffer` to OSS using existing helpers
      return reply.send({
        message: 'markdown uploaded',
        article_id: upload.articleId,
        sort: upload.sort,
        filename: upload.filename,
        size: upload.fileBuffer.length
      })
    } catch (err) {
      request.log.error({ err }, 'parse markdown upload failed')
      return reply.internalServerError('parse markdown upload failed') as never
    }
  })
}

export default markdown

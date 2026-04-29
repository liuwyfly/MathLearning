import { type MultipartFile } from '@fastify/multipart'
import { type FastifyInstance, type FastifyPluginAsync, type FastifyRequest } from 'fastify'
import { type MultipartField } from '../../../common/multipart'
import { ParsePositiveIntegerField, ParsePositiveNumberField } from '../../../common/validation'
import OSS from 'ali-oss'

const client = new OSS({
  region: process.env.OSS_REGION,  // 'oss-cn-wulanchabu',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID ?? '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET ?? '',
  authorizationV4: true,
  bucket: 'turbo2016',
})

type MarkdownUploadPayload = {
  articleId: number
  sort: number
  filename: string
  fileBuffer: Buffer
}

async function parseMarkdownUpload (fastify: FastifyInstance, request: FastifyRequest, basePath: string): Promise<MarkdownUploadPayload | { errorMessage: string }> {
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

  let ret = {
    articleId,
    sort,
    filename,
    fileBuffer
  }
  // return ret
  
  try {
    // 2. 将路径和文件名拼接起来
    // 注意：这里使用了 basePath + filename
    // 如果 OSS 中已经存在同名文件，会被直接覆盖
    const objectKey = basePath + filename;
    fastify.log.info({ articleId, sort, objectKey }, 'parsed markdown upload payload')

    const result = await client.put(objectKey, fileBuffer, {
      headers: {
          'Content-Type': 'text/markdown; charset=utf-8'
      }
    })

    fastify.log.info({ result }, 'markdown file uploaded to OSS successfully')
    return ret
  } catch (err) {
    fastify.log.error({ err }, 'upload markdown to oss failed')
    return { errorMessage: 'upload markdown to oss failed' }
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

    // 1. 定义你的基础路径
    const basePath = '/mathlearning/junior_high_sch/';

    try {
      const upload = await parseMarkdownUpload(fastify, request, basePath)
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

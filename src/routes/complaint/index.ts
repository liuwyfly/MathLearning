import { type FastifyPluginAsync } from 'fastify'
import {
  GetComplaints,
  PostComplaint,
  PutComplaint,
  PatchComplaint,
  type PostComplaintBody,
  type PutComplaintBody,
  type PatchComplaintBody,
  postComplaintBodySchema,
  putComplaintBodySchema,
  patchComplaintBodySchema
} from './complaintViews'

// autoload 会把目录名作为路由前缀，这里注册的路径会自动挂在 /complaint 下
const complaint: FastifyPluginAsync = async (fastify): Promise<void> => {
  // 获取当前用户的投诉列表
  fastify.get('/', { onRequest: [fastify.authenticate] }, GetComplaints)

  // 新建投诉
  fastify.post<{ Body: PostComplaintBody }>(
    '/',
    {
      onRequest: [fastify.authenticate],
      schema: { body: postComplaintBodySchema }
    },
    PostComplaint
  )

  // 全量更新投诉
  // 用户可以更新自己的投诉
  fastify.put<{ Body: PutComplaintBody }>(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      schema: { body: putComplaintBodySchema }
    },
    PutComplaint
  )

  // 部分更新投诉
  // 用户可以更新自己的投诉的状态
  fastify.patch<{ Body: PatchComplaintBody }>(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      schema: { body: patchComplaintBodySchema }
    },
    PatchComplaint
  )
}

export default complaint

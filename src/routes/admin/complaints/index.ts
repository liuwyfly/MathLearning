import { type FastifyPluginAsync } from 'fastify'
import {
  GetAdminComplaints,
  GetAdminComplaintDetail,
  PostAdminComplaintReply,
  type AdminComplaintListQuery,
  type AdminComplaintParams,
  type PostAdminComplaintReplyBody,
  adminComplaintListQuerySchema,
  adminComplaintIdParamsSchema,
  postAdminComplaintReplyBodySchema
} from './complaintViews'

// autoload 会把目录名作为路由前缀，这里注册的路径会自动挂在 /admin/complaints 下
const adminComplaints: FastifyPluginAsync = async (fastify): Promise<void> => {
  // 管理员获取投诉列表，支持 ?status=WAITING_FOR 过滤
  fastify.get<{ Querystring: AdminComplaintListQuery }>(
    '/',
    {
      onRequest: [fastify.authenticate],
      schema: { querystring: adminComplaintListQuerySchema }
    },
    GetAdminComplaints
  )

  // 管理员获取单条投诉详情（含投诉图片）
  fastify.get<{ Params: AdminComplaintParams }>(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      schema: { params: adminComplaintIdParamsSchema }
    },
    GetAdminComplaintDetail
  )

  // 管理员回复用户投诉/反馈
  fastify.post<{ Params: AdminComplaintParams, Body: PostAdminComplaintReplyBody }>(
    '/:id/replies',
    {
      onRequest: [fastify.authenticate],
      schema: { params: adminComplaintIdParamsSchema, body: postAdminComplaintReplyBodySchema }
    },
    PostAdminComplaintReply
  )
}

export default adminComplaints

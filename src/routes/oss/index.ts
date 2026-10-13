import { type FastifyPluginAsync } from 'fastify'
import { GetOssStsToken } from './stsViews'
import signPrivateBucketUrl from './signPrivateBucketUrl'

// autoload 会把目录名作为路由前缀，这里注册的路径会自动挂在 /oss 下
const oss: FastifyPluginAsync = async (fastify): Promise<void> => {
  // 获取 OSS STS 临时凭证（客户端直传反馈截图用）
  fastify.get('/sts', { onRequest: [fastify.authenticate] }, GetOssStsToken)
  // 私有 Bucket 对象签名 URL（访问反馈截图用）
  fastify.post('/sign_prv_url', { onRequest: [fastify.authenticate] }, signPrivateBucketUrl)
}

export default oss

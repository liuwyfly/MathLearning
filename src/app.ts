import { join } from 'node:path'
import AutoLoad, { AutoloadPluginOptions } from '@fastify/autoload'
import { FastifyPluginAsync, FastifyServerOptions } from 'fastify'
import Ajv from 'ajv'
import addErrors from 'ajv-errors'

export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {
  routePrefix?: string
}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {
  pluginTimeout: Number(process.env.FASTIFY_PLUGIN_TIMEOUT_MS ?? 20000)
}

const ajv = new Ajv({
  allErrors: true,
  coerceTypes: true,
  removeAdditional: false,
  strict: false,
  useDefaults: true
})

addErrors(ajv)

// 处理 app 路径前缀
function normalizeRoutePrefix (routePrefix?: string): string {
  if (routePrefix == null) {
    return ''
  }

  const trimmed = routePrefix.trim()
  if (trimmed === '' || trimmed === '/') {
    return ''
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeadingSlash.replace(/\/+$/, '')
}

// 处理 app 路径前缀
function resolveRoutePrefix (optsPrefix?: string): string {
  const normalizedFromOpts = normalizeRoutePrefix(optsPrefix)
  if (normalizedFromOpts !== '') {
    return normalizedFromOpts
  }

  return normalizeRoutePrefix(process.env.FASTIFY_ROUTE_PREFIX)
}

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts
): Promise<void> => {
  // Place here your custom code!

  fastify.setValidatorCompiler(({ schema }) => ajv.compile(schema))

  fastify.setSchemaErrorFormatter((errors, dataVar) => {
    const messages = errors.map((issue) => {
      const issueMessage = issue.message
      const missingProperty = issue.params != null && typeof issue.params === 'object' && 'missingProperty' in issue.params
        ? (issue.params as { missingProperty?: string }).missingProperty
        : undefined
      const instancePath = issue.instancePath?.replace(/^\//, '')
      const fieldName = missingProperty ?? instancePath

      if (fieldName != null && fieldName !== '' && issueMessage != null && issueMessage !== '') {
        return `字段 ${fieldName}: ${issueMessage}`
      }

      if (fieldName != null && fieldName !== '') {
        return `字段 ${fieldName} 不合法`
      }

      if (issueMessage != null && issueMessage !== '') {
        return issueMessage
      }

      return `${dataVar} 校验失败`
    })

    return new Error(messages.length > 0 ? `请求参数校验失败: ${messages.join('；')}` : '请求参数校验失败')
  })

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts
  })

  // This loads all plugins defined in routes
  // define your routes in one of these
  // eslint-disable-next-line no-void
  const routePrefix = resolveRoutePrefix(opts.routePrefix)

  void fastify.register(async function routesScope (routesFastify) {
    void routesFastify.register(AutoLoad, {
      dir: join(__dirname, 'routes'),
      options: opts
    })
  }, {
    prefix: routePrefix
  })
}

export default app
export { app, options }

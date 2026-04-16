import { join } from 'node:path'
import AutoLoad, { AutoloadPluginOptions } from '@fastify/autoload'
import { FastifyPluginAsync, FastifyServerOptions } from 'fastify'

export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {
  routePrefix?: string
}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {
}

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

import fp from 'fastify-plugin'
import cors from '@fastify/cors'

function resolveCorsOrigin (): true | string[] {
  const configuredOrigins = process.env.CORS_ORIGIN
    ?.split(',')
    .map(origin => origin.trim())
    .filter(Boolean)

  if (configuredOrigins != null && configuredOrigins.length > 0) {
    return configuredOrigins
  }

  // Default to reflected Origin for local dev (e.g. Vite at localhost:5173).
  return true
}

export default fp(async (fastify) => {
  fastify.register(cors, {
    origin: resolveCorsOrigin(),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
  })
})
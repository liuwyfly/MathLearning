/*
 * Prisma Client Path
 * Default:
 * .\node_modules\@prisma\client
 * 
 * Specified:
 * If the path is specified, it should point to the generated Prisma Client directory 
 * both in src and dist.
 * import { PrismaClient } from '../generated/prisma-client'
 * 
 * tsconfig.json
 * "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "sourceMap": true,
    "paths": {
      "@prisma/client": ["./src/generated/prisma-client"]
    }
  }

 * schema.prisma
    generator client {
    provider = "prisma-client-js"
    output   = "../src/generated/prisma-client"
  }
 *
 * pakcage.josn build
 * "build:ts": "tsc && node -e \"require('fs').cpSync('src/generated/prisma-client', 'dist/generated/prisma-client', {recursive: true, force: true})\"",

 */

import fp from 'fastify-plugin'
import { PrismaClient } from '../generated/prisma-client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import type { PoolConfig } from 'mariadb'
import type { FastifyPluginAsync } from 'fastify'

// Singleton instance
let prismaInstance: PrismaClient | null = null
let isConnecting = false

const toPositiveInt = (value: string | null | undefined, fallback: number): number => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return Math.floor(parsed)
}

const getPrismaClient = async (): Promise<PrismaClient> => {
  if (prismaInstance) {
    return prismaInstance
  }

  // Prevent multiple simultaneous initialization attempts
  if (isConnecting) {
    while (!prismaInstance) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return prismaInstance
  }

  isConnecting = true

  try {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required to initialize Prisma adapter')
    }

    const database = new URL(databaseUrl)
    const connectionLimit = toPositiveInt(
      process.env.PRISMA_CONNECTION_LIMIT ?? database.searchParams.get('connection_limit'),
      1
    )
    const acquireTimeoutMs = toPositiveInt(
      process.env.PRISMA_POOL_TIMEOUT_MS
        ?? (process.env.PRISMA_POOL_TIMEOUT ? String(Number(process.env.PRISMA_POOL_TIMEOUT) * 1000) : null),
      15000
    )
    const idleTimeoutSeconds = toPositiveInt(process.env.PRISMA_IDLE_TIMEOUT_SECONDS, 60)

    const adapterConfig: PoolConfig = {
      host: database.hostname,
      port: database.port ? toPositiveInt(database.port, 3306) : 3306,
      user: decodeURIComponent(database.username),
      password: decodeURIComponent(database.password),
      database: database.pathname.replace(/^\//, ''),
      connectionLimit,
      acquireTimeout: acquireTimeoutMs,
      idleTimeout: idleTimeoutSeconds
    }

    const connectTimeoutMs = Number(process.env.PRISMA_CONNECT_TIMEOUT_MS ?? 8000)
    const adapter = new PrismaMariaDb(adapterConfig)

    const newClient = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development'
        ? [
            { level: 'query', emit: 'event' },
            { level: 'info', emit: 'stdout' },
            { level: 'warn', emit: 'stdout' },
            { level: 'error', emit: 'stdout' }
          ]
        : ['error']
    })

    if (process.env.NODE_ENV === 'development') {
      newClient.$on('query', (e) => {
        console.log(`[Prisma Query] ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`)
      })
    }

    let connectTimeout: NodeJS.Timeout | undefined
    const connectTimeoutPromise = new Promise<never>((_, reject) => {
      connectTimeout = setTimeout(() => {
        reject(new Error(`Prisma connection timeout after ${connectTimeoutMs}ms`))
      }, connectTimeoutMs)
    })

    try {
      await Promise.race([
        newClient.$connect(),
        connectTimeoutPromise
      ])
    } finally {
      if (connectTimeout) {
        clearTimeout(connectTimeout)
      }
    }

    prismaInstance = newClient
    return prismaInstance
  } finally {
    isConnecting = false
  }
}

const prismaPlugin: FastifyPluginAsync = async (fastify, _opts) => {
  try {
    const prisma = await getPrismaClient()
    fastify.decorate('prisma', prisma)
  } catch (error) {
    fastify.log.error({ err: error }, 'Failed to initialize Prisma Client')
    throw error
  }

  fastify.addHook('onClose', async (instance) => {
    instance.log.info('Disconnecting Prisma Client...')
    if (prismaInstance) {
      await prismaInstance.$disconnect()
    }
  })
}

export default fp(prismaPlugin, { name: 'prisma' })

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

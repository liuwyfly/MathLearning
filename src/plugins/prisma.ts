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
 */

import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import type { FastifyPluginAsync } from 'fastify'



// 自定义选项类型
export interface PrismaPluginOptions {
  // 可在此扩展插件选项
}

const prismaPlugin: FastifyPluginAsync<PrismaPluginOptions> = async (fastify, _opts) => {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to initialize Prisma adapter')
  }

  const adapter = new PrismaMariaDb(databaseUrl)

  const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['error']
  })

  await prisma.$connect()

  fastify.decorate('prisma', prisma)

  fastify.addHook('onClose', async (instance) => {
    instance.log.info('Disconnecting Prisma Client...')
    await prisma.$disconnect()
  })
}

export default fp(prismaPlugin, { name: 'prisma' })

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

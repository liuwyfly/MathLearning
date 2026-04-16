import fp from 'fastify-plugin'
import mysql from '@fastify/mysql'
import type { Pool as PromisePool } from 'mysql2/promise'

export type MySQLPromisePool = Pick<PromisePool, 'query' | 'execute' | 'getConnection'> & {
  pool: PromisePool
}

/*
 * connectionLimit: 3：每个 Fastify 实例最多 3 个连接。
 * maxIdle: 2：空闲时尽量只保留 2 个连接。
 * queueLimit: 10：池满后最多排 10 个等待，避免无限堆积。
 * waitForConnections: true：连接满了先排队，不立刻失败。
 * connectTimeout: 10000：数据库异常时 10 秒内失败，避免请求卡太久。
 */

export default fp(async (fastify) => {
  fastify.register(mysql, {
    promise: true,
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? 'root',
    password: process.env.MYSQL_PASSWORD ?? '',
    database: process.env.MYSQL_DATABASE ?? 'dbname',
    waitForConnections: true,
    connectionLimit: 3,
    maxIdle: 2,
    idleTimeout: 60000,
    queueLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 10000
  })
})

declare module 'fastify' {
  interface FastifyInstance {
    mysql: MySQLPromisePool
  }
}

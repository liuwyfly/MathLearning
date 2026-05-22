/**
 * 函数名 prisma 开头，表示用于 Prisma ORM 处理本地时间
 * 获取当前本地时间对应的 Date 对象。
 *
 * Prisma 在存储 Date 时会按 UTC 存储，因此需要对时区偏移进行补偿，
 * 使得最终写入数据库的时间戳等于本地时间的“时钟面”。
 */
export function prismaLocalNow (): Date {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset)
}

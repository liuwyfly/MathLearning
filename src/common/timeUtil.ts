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

// 格式化为 本地时区的 "年-月-日 时:分:秒.毫秒"，如 2025-06-25 14:30:05.123
export function formatLocalDateTime (d: Date): string {
  const pad = (n: number, len = 2): string => String(n).padStart(len, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}

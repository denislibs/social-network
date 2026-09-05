import { createRedis } from '../../src/redis'

export function testRedis() {
  return createRedis(
    process.env.REDIS_URL ?? 'redis://localhost:6379',
    Number(process.env.REDIS_DB_TEST ?? 1),
  )
}

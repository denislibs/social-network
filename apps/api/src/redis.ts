import Redis from 'ioredis'

export function createRedis(url: string, db = 0): Redis {
  return new Redis(url, { db, maxRetriesPerRequest: 3, lazyConnect: false })
}

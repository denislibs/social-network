import type Redis from 'ioredis'
import { type App, buildApp } from '../../src/app'
import type { Db } from '../../src/db/client'
import { CommandBus } from '../../src/kernel/command-bus'
import { EventBus } from '../../src/kernel/event-bus'
import { QueryBus } from '../../src/kernel/query-bus'
import { testDb } from './db'
import { testRedis } from './redis'

export type TestApp = { app: App; db: Db; redis: Redis; close(): Promise<void> }

export async function createTestApp(): Promise<TestApp> {
  const db = await testDb()
  const redis = testRedis()
  const app = await buildApp({
    db,
    redis,
    commands: new CommandBus(),
    queries: new QueryBus(),
    events: new EventBus({ error: () => {} }),
    cookieSecure: false,
  })
  return {
    app,
    db,
    redis,
    close: async () => {
      await db.$client.close()
      redis.disconnect()
    },
  }
}

export function cookieFrom(res: Response): string {
  const raw = res.headers.get('set-cookie') ?? ''
  const m = raw.match(/sid=([^;]+)/)
  if (!m) throw new Error(`no sid cookie in ${raw}`)
  return `sid=${m[1]}`
}

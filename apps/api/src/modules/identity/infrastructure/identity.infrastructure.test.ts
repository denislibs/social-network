import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { testDb, truncateAll } from '../../../../test/helpers/db'
import { testRedis } from '../../../../test/helpers/redis'
import type { Db } from '../../../db/client'
import { User } from '../domain/user'
import { BunPasswordHasher } from './bun-password-hasher'
import { DrizzleUserRepository } from './drizzle-user-repository'
import { RedisSessionStore } from './redis-session-store'

let db: Db
const redis = testRedis()
beforeAll(async () => {
  db = await testDb()
})
beforeEach(async () => {
  await truncateAll(db)
  await redis.flushdb()
})
afterAll(async () => {
  await db.$client.close()
  redis.disconnect()
})

describe('BunPasswordHasher', () => {
  it('hashes with argon2id and verifies', async () => {
    const h = new BunPasswordHasher()
    const hash = await h.hash('password123')
    expect(hash.startsWith('$argon2id$')).toBe(true)
    expect(await h.verify('password123', hash)).toBe(true)
    expect(await h.verify('x', hash)).toBe(false)
  })
})

describe('DrizzleUserRepository', () => {
  it('saves new user with generated id and finds by login/id', async () => {
    const repo = new DrizzleUserRepository(db)
    const u = await User.register(
      { login: 'denis', password: 'password123', firstName: 'Д', lastName: 'К' },
      new BunPasswordHasher(),
    )
    const saved = await repo.save(u)
    expect(saved.id).toBeGreaterThan(0)
    expect((await repo.findByLogin('denis'))?.id).toBe(saved.id)
    expect((await repo.findById(saved.id!))?.login.value).toBe('denis')
    expect(await repo.findByLogin('nobody')).toBeNull()
  })
})

describe('RedisSessionStore', () => {
  it('creates token, reads it back, tracks per-user set, deletes', async () => {
    const store = new RedisSessionStore(redis, { ttlSeconds: 100 })
    const t1 = await store.create(7, { ua: 'test' })
    const t2 = await store.create(7, {})
    expect(t1).toMatch(/^[a-f0-9]{64}$/)
    expect(await store.get(t1)).toEqual({ userId: 7 })
    expect(await redis.smembers('user_sessions:7')).toHaveLength(2)
    expect(await redis.ttl(`sess:${t1}`)).toBeGreaterThan(90)
    await store.delete(t1)
    expect(await store.get(t1)).toBeNull()
    expect(await redis.smembers('user_sessions:7')).toEqual([t2])
    await store.deleteAllForUser(7)
    expect(await store.get(t2)).toBeNull()
    expect(await redis.exists('user_sessions:7')).toBe(0)
  })
  it('touch extends ttl when below threshold', async () => {
    const store = new RedisSessionStore(redis, { ttlSeconds: 100, touchBelowSeconds: 200 })
    const t = await store.create(1, {})
    await redis.expire(`sess:${t}`, 10)
    await store.touch(t)
    expect(await redis.ttl(`sess:${t}`)).toBeGreaterThan(90)
  })
})

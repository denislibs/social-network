import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { testDb, truncateAll } from '../../../../test/helpers/db'
import { explainWithoutSeqScan, planNodes } from '../../../../test/helpers/explain'
import { syntheticGraph } from '../../../../test/helpers/graph-fixture'
import { testRedis } from '../../../../test/helpers/redis'
import type { Db } from '../../../db/client'
import { User } from '../domain/user'
import { BunPasswordHasher } from './bun-password-hasher'
import { DrizzleUserReadModel, searchUsersQuery } from './drizzle-user-read-model'
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
  it('maps a concurrent duplicate login to 409 login_taken, not a 500', async () => {
    const repo = new DrizzleUserRepository(db)
    const hasher = new BunPasswordHasher()
    const input = { login: 'race', password: 'password123', firstName: 'Д', lastName: 'К' }
    await repo.save(await User.register(input, hasher))
    // A second aggregate that never saw the first one — what the losing side of a concurrent
    // registration holds after both passed the application-level findByLogin check.
    await expect(repo.save(await User.register(input, hasher))).rejects.toMatchObject({
      code: 'login_taken',
      status: 409,
    })
  })
  it('persists updateProfile changes (status, bio, city, birthday, screenName)', async () => {
    const repo = new DrizzleUserRepository(db)
    const hasher = new BunPasswordHasher()
    const saved = await repo.save(
      await User.register(
        { login: 'profile1', password: 'password123', firstName: 'Д', lastName: 'К' },
        hasher,
      ),
    )
    saved.updateProfile({
      status: 'Hi',
      bio: 'About',
      city: 'Москва',
      birthday: '1990-01-01',
      screenName: 'profileuser',
    })
    await repo.save(saved)
    const found = await repo.findById(saved.id!)
    expect(found).toMatchObject({
      status: 'Hi',
      bio: 'About',
      city: 'Москва',
      birthday: '1990-01-01',
      screenName: 'profileuser',
    })
  })
  it('maps a duplicate screen name to 409 screen_name_taken, not a 500', async () => {
    const repo = new DrizzleUserRepository(db)
    const hasher = new BunPasswordHasher()
    const a = await repo.save(
      await User.register(
        { login: 'sn1', password: 'password123', firstName: 'Д', lastName: 'К' },
        hasher,
      ),
    )
    const b = await repo.save(
      await User.register(
        { login: 'sn2', password: 'password123', firstName: 'Д', lastName: 'К' },
        hasher,
      ),
    )
    a.updateProfile({ screenName: 'sharedname' })
    await repo.save(a)
    b.updateProfile({ screenName: 'sharedname' })
    await expect(repo.save(b)).rejects.toMatchObject({ code: 'screen_name_taken', status: 409 })
  })
  it('findByScreenName finds a user by screen name, null when absent', async () => {
    const repo = new DrizzleUserRepository(db)
    const hasher = new BunPasswordHasher()
    const u = await repo.save(
      await User.register(
        { login: 'sn3', password: 'password123', firstName: 'Д', lastName: 'К' },
        hasher,
      ),
    )
    u.updateProfile({ screenName: 'findme' })
    await repo.save(u)
    expect((await repo.findByScreenName('findme'))?.id).toBe(u.id)
    expect(await repo.findByScreenName('nope')).toBeNull()
  })
})

describe('DrizzleUserReadModel', () => {
  it('getProfile resolves by id and by (lower-cased) screen name, null when unknown', async () => {
    const repo = new DrizzleUserRepository(db)
    const rm = new DrizzleUserReadModel(db)
    const hasher = new BunPasswordHasher()
    const u = await repo.save(
      await User.register(
        { login: 'denis', password: 'password123', firstName: 'Денис', lastName: 'Кораблев' },
        hasher,
      ),
    )
    u.updateProfile({ screenName: 'denis' })
    await repo.save(u)
    expect((await rm.getProfile(`id${u.id}`))?.id).toBe(u.id!)
    expect((await rm.getProfile('denis'))?.id).toBe(u.id!)
    expect(await rm.getProfile('id999999')).toBeNull()
  })
  it('getProfile is case-insensitive: `ID{n}` and an upper-cased screen name both resolve', async () => {
    const repo = new DrizzleUserRepository(db)
    const rm = new DrizzleUserReadModel(db)
    const hasher = new BunPasswordHasher()
    const u = await repo.save(
      await User.register(
        { login: 'denisci', password: 'password123', firstName: 'Денис', lastName: 'Кораблев' },
        hasher,
      ),
    )
    u.updateProfile({ screenName: 'denisci' })
    await repo.save(u)
    expect((await rm.getProfile(`ID${u.id}`))?.id).toBe(u.id!)
    expect((await rm.getProfile('DENISCI'))?.id).toBe(u.id!)
  })
  it('searchUsers finds by trigram name similarity and by screen-name prefix', async () => {
    const repo = new DrizzleUserRepository(db)
    const rm = new DrizzleUserReadModel(db)
    const hasher = new BunPasswordHasher()
    const u = await repo.save(
      await User.register(
        { login: 'denis2', password: 'password123', firstName: 'Денис', lastName: 'Кораблев' },
        hasher,
      ),
    )
    u.updateProfile({ screenName: 'den' })
    await repo.save(u)
    const byName = await rm.searchUsers('Ден', 10)
    expect(byName.some((r) => r.id === u.id)).toBe(true)
    const byScreenName = await rm.searchUsers('den', 10)
    expect(byScreenName.some((r) => r.id === u.id)).toBe(true)
  })

  it('searchUsers can be answered from the trigram indexes, without a seq scan on users', async () => {
    await syntheticGraph(db)
    const { sql: text, params } = searchUsersQuery(db, 'Имя1000', 20).toSQL()

    // At 3000 rows a sequential scan genuinely *is* the cheaper plan, so the planner picks it no
    // matter how the predicate is written — which says nothing about whether an index could be
    // used at all. `enable_seqscan = off` takes that shortcut away: the query then has to be
    // answered from an index, and it only can be because `%` and `like … || '%'` are operators
    // `gin_trgm_ops` supports. The `similarity(x, $1) > 0.2` predicate this replaced has no index
    // path whatsoever, which is what the negative control below pins down. Note this proves index
    // *usability*, not the planner's actual preference at normal cost settings — and the real
    // read model (`searchUsers`) wraps this exact query in `SET LOCAL pg_trgm.similarity_threshold
    // = 0.2` so `%` compares against the same threshold the old `similarity(...) > 0.2` did.
    const plan = await explainWithoutSeqScan(db, text, params)
    const nodes = planNodes(plan)
    const indexNames = nodes
      .filter((n) => n['Node Type'] === 'Bitmap Index Scan')
      .map((n) => n['Index Name'])
    expect(nodes.some((n) => n['Node Type'] === 'Bitmap Heap Scan')).toBe(true)
    expect(indexNames).toContain('users_name_trgm')
    expect(indexNames).toContain('users_screen_name_trgm')
    expect(
      nodes.filter((n) => n['Node Type'] === 'Seq Scan' && n['Relation Name'] === 'users'),
    ).toEqual([])
  })

  it('negative control: the old similarity() predicate has no index path at all', async () => {
    await syntheticGraph(db)
    const legacy = `select id from users
      where similarity(lower(first_name || ' ' || last_name), lower($1)) > 0.2
         or lower(first_name || ' ' || last_name) like lower($1) || '%'
         or lower(screen_name) like lower($1) || '%'
      limit 20`
    const plan = await explainWithoutSeqScan(db, legacy, ['Имя1000'])
    const nodes = planNodes(plan)
    // Even with sequential scans disabled the planner has nothing else to offer for the
    // `similarity(...) > 0.2` arm, so it falls back to a (disabled, astronomically costed) one.
    expect(
      nodes.filter((n) => n['Node Type'] === 'Seq Scan' && n['Relation Name'] === 'users'),
    ).not.toEqual([])
  })
})

describe('RedisSessionStore', () => {
  it('surfaces per-command MULTI errors instead of silently succeeding', async () => {
    const store = new RedisSessionStore(redis, { ttlSeconds: 100 })
    await redis.set('user_sessions:9', 'not-a-set') // WRONGTYPE for SADD
    await expect(store.create(9, {})).rejects.toThrow(/WRONGTYPE/)
  })
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

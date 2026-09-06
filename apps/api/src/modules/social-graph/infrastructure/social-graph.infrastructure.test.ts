import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { testDb, truncateAll } from '../../../../test/helpers/db'
import { graphFixture } from '../../../../test/helpers/graph-fixture'
import { testRedis } from '../../../../test/helpers/redis'
import type { Db } from '../../../db/client'
import { communities, follows, friendships, users } from '../../../db/schema'
import { Community } from '../domain/community'
import { Friendship } from '../domain/friendship'
import { DrizzleCommunityRepository } from './drizzle-community-repository'
import { DrizzleFollowRepository } from './drizzle-follow-repository'
import { DrizzleFriendshipRepository } from './drizzle-friendship-repository'
import { DrizzleSocialReadModel } from './drizzle-social-read-model'
import { DrizzleSuggestionHider } from './drizzle-suggestion-hider'
import { PYMK_SQL } from './pymk.sql'
import { RedisSuggestionCache } from './redis-suggestion-cache'

/** Walks an `EXPLAIN (FORMAT JSON)` result tree and collects every `Seq Scan` node's relation. */
function findSeqScans(node: unknown): { relation: string | undefined }[] {
  if (Array.isArray(node)) return node.flatMap(findSeqScans)
  if (node && typeof node === 'object') {
    const rec = node as Record<string, unknown>
    const here =
      rec['Node Type'] === 'Seq Scan'
        ? [{ relation: rec['Relation Name'] as string | undefined }]
        : []
    return [...here, ...Object.values(rec).flatMap(findSeqScans)]
  }
  return []
}

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

describe('DrizzleSocialReadModel', () => {
  it('relation/counters/friends/requests agree with the fixture', async () => {
    const f = await graphFixture(db)
    const rm = new DrizzleSocialReadModel(db)

    expect(await rm.relation(1, 2)).toBe('friends')
    expect(await rm.relation(1, 12)).toBe('incoming')
    expect(await rm.relation(1, 13)).toBe('outgoing')
    expect(await rm.relation(1, 1)).toBe('self')
    expect(await rm.relation(null, 1)).toBe('none')

    // See graph-fixture.ts's doc comment for the followers=7 breakdown.
    expect(await rm.counters(1)).toEqual({
      friends: 10,
      followers: 7,
      communities: f.communitiesOf1,
      incomingRequests: 1,
    })

    const p1 = await rm.friends(1)
    expect(p1.items).toHaveLength(10)
    expect(p1.nextCursor).toBeNull()
    expect(new Set(p1.items.map((u) => u.id))).toEqual(new Set([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]))

    expect((await rm.requests(1, 'incoming')).items.map((u) => u.id)).toEqual([12])
    expect((await rm.requests(1, 'outgoing')).items.map((u) => u.id)).toEqual([13])
  })

  it('paginates friends by (created_at desc, id desc) with an opaque cursor', async () => {
    await graphFixture(db, { friendsOf1: 45 })
    const rm = new DrizzleSocialReadModel(db)
    const a = await rm.friends(1)
    const b = await rm.friends(1, a.nextCursor ?? undefined)
    const c3 = await rm.friends(1, b.nextCursor ?? undefined)
    expect([a.items.length, b.items.length, c3.items.length]).toEqual([20, 20, 5])
    expect(c3.nextCursor).toBeNull()
    const allIds = new Set([...a.items, ...b.items, ...c3.items].map((u) => u.id))
    expect(allIds.size).toBe(45)
  })

  it('friends(): a batch of 25 rows sharing one timestamp still paginates 20 + 5 with no gaps or duplicates', async () => {
    // A single insert() call, unlike graph-fixture's per-row loop, gives every row the exact
    // same Postgres per-statement `now()` snapshot for created_at/accepted_at — the shape that
    // previously slipped a row past the millisecond-precision keyset cursor at a page boundary.
    await db.insert(users).values({
      id: 1,
      login: 'user1',
      passwordHash: 'x',
      firstName: 'Имя1',
      lastName: 'Фамилия1',
    })
    const friendIds = Array.from({ length: 25 }, (_, i) => 5000 + i)
    await db.insert(users).values(
      friendIds.map((id) => ({
        id,
        login: `bulkfriend${id}`,
        passwordHash: 'x',
        firstName: `Имя${id}`,
        lastName: `Фамилия${id}`,
      })),
    )
    await db.execute(
      sql`select setval(pg_get_serial_sequence('users','id'), (select max(id) from users))`,
    )
    const now = new Date()
    await db.insert(friendships).values(
      friendIds.map((id) => ({
        userLo: Math.min(1, id),
        userHi: Math.max(1, id),
        status: 'accepted' as const,
        requesterId: 1,
        createdAt: now,
        acceptedAt: now,
      })),
    )
    await db
      .insert(follows)
      .values(friendIds.map((id) => ({ followerId: 1, targetType: 'user' as const, targetId: id })))

    const rm = new DrizzleSocialReadModel(db)
    const a = await rm.friends(1)
    const b = await rm.friends(1, a.nextCursor ?? undefined)
    expect([a.items.length, b.items.length]).toEqual([20, 5])
    expect(b.nextCursor).toBeNull()
    const allIds = new Set([...a.items, ...b.items].map((u) => u.id))
    expect(allIds.size).toBe(25)
  })

  it("requests(1,'incoming'): a batch of 25 pending rows sharing one timestamp still paginates 20 + 5 with no gaps", async () => {
    await db.insert(users).values({
      id: 1,
      login: 'user1',
      passwordHash: 'x',
      firstName: 'Имя1',
      lastName: 'Фамилия1',
    })
    const requesterIds = Array.from({ length: 25 }, (_, i) => 6000 + i)
    await db.insert(users).values(
      requesterIds.map((id) => ({
        id,
        login: `bulkrequester${id}`,
        passwordHash: 'x',
        firstName: `Имя${id}`,
        lastName: `Фамилия${id}`,
      })),
    )
    await db.execute(
      sql`select setval(pg_get_serial_sequence('users','id'), (select max(id) from users))`,
    )
    const now = new Date()
    await db.insert(friendships).values(
      requesterIds.map((id) => ({
        userLo: Math.min(1, id),
        userHi: Math.max(1, id),
        status: 'pending' as const,
        requesterId: id,
        createdAt: now,
        acceptedAt: null,
      })),
    )

    const rm = new DrizzleSocialReadModel(db)
    const a = await rm.requests(1, 'incoming')
    const b = await rm.requests(1, 'incoming', a.nextCursor ?? undefined)
    expect([a.items.length, b.items.length]).toEqual([20, 5])
    expect(b.nextCursor).toBeNull()
    const allIds = new Set([...a.items, ...b.items].map((u) => u.id))
    expect(allIds.size).toBe(25)
  })

  it('suggestions: friends-of-friends ranked by mutual, excludes self/friends/pending/hidden, uses index scans', async () => {
    await graphFixture(db, { pymk: true })
    const rm = new DrizzleSocialReadModel(db)
    const s = await rm.suggestions(1)
    expect(s.map((x) => x.id)).toEqual([7, 8, 11])
    expect(s[0]).toMatchObject({ id: 7, mutual: 3 })
    expect(s.find((x) => x.id === 9)).toBeUndefined() // pending with 1
    expect(s.find((x) => x.id === 10)).toBeUndefined() // hidden by 1
  })

  it('PYMK query plan does not seq-scan friendships at realistic scale', async () => {
    // The fixture's handful of rows gives the planner no reason to prefer an index (a seq scan
    // over 30 rows *is* the cheap plan), so this asserts against a synthetic dataset large enough
    // for real statistics: 3000 users, ~30000 friendship rows, freshly ANALYZEd.
    await db.execute(sql`
      insert into users (id, login, password_hash, first_name, last_name, city)
      select g, 'bulk' || g, 'x', 'Имя' || g, 'Фамилия' || g, case when g % 2 = 0 then 'Москва' else 'Казань' end
      from generate_series(1, 3000) g
    `)
    await db.execute(sql`
      insert into friendships (user_lo, user_hi, status, requester_id, created_at, accepted_at)
      select lo, hi, 'accepted', lo, now(), now()
      from (
        select g as lo, 1 + ((g + o) % 3000) as hi, o
        from generate_series(1, 3000) g, generate_series(1, 10) o
      ) pairs
      where lo < hi
      on conflict (user_lo, user_hi) do nothing
    `)
    await db.execute(sql`analyze friendships`)
    await db.execute(sql`analyze users`)

    const plan = await db.execute<{ 'QUERY PLAN': unknown }>(
      sql.raw(`EXPLAIN (FORMAT JSON) ${PYMK_SQL.replace(/\$1::bigint/g, '1::bigint')}`),
    )
    const seqScansOnFriendships = findSeqScans(plan).filter((n) => n.relation === 'friendships')
    expect(seqScansOnFriendships).toEqual([])
  }, 5000)

  it('searchCommunities and screen-name resolve', async () => {
    await graphFixture(db)
    const rm = new DrizzleSocialReadModel(db)
    expect((await rm.searchCommunities('кин', 10)).map((c) => c.screenName)).toContain('kino')
    const kino = await rm.resolveHandle('kino')
    expect(kino?.kind).toBe('community')
    expect(await rm.resolveHandle('id1')).toEqual({ kind: 'user', id: 1 })
    expect(await rm.resolveHandle('nobody')).toBeNull()
  })

  it('community() reports membership and follow state', async () => {
    await graphFixture(db)
    const rm = new DrizzleSocialReadModel(db)
    const asMember = await rm.community('kino', 1)
    expect(asMember).toMatchObject({ screenName: 'kino', membership: 'admin', topic: 'cinema' })
    const asStranger = await rm.community('kino', 14)
    expect(asStranger).toMatchObject({ membership: 'none', isFollowing: false })
    expect(await rm.community('nope', 1)).toBeNull()
  })

  it('members() and myCommunities() reflect community_members', async () => {
    await graphFixture(db)
    const rm = new DrizzleSocialReadModel(db)
    const kino = await rm.resolveHandle('kino')
    const page = await rm.members(kino!.id)
    expect(new Set(page.items.map((u) => u.id))).toEqual(new Set([1, 2, 3]))
    const mine = await rm.myCommunities(1)
    expect(new Set(mine.map((c) => c.screenName))).toEqual(new Set(['kino', 'it_club']))
  })
})

describe('RedisSuggestionCache', () => {
  it('set/get/invalidate with TTL', async () => {
    const cache = new RedisSuggestionCache(redis)
    await cache.set(1, [], 600)
    expect(await cache.get(1)).toEqual([])
    expect(await redis.ttl('pymk:1')).toBeGreaterThan(500)
    await cache.invalidate([1])
    expect(await cache.get(1)).toBeNull()
  })
})

describe('DrizzleFriendshipRepository', () => {
  it('save inserts, updates via onConflictDoUpdate, and deletes on isRemoved', async () => {
    await graphFixture(db)
    const repo = new DrizzleFriendshipRepository(db)

    const f = Friendship.request(20, 21)
    await repo.save(f)
    const found = await repo.find(20, 21)
    expect(found?.props.status).toBe('pending')

    found!.accept(21)
    await repo.save(found!)
    const accepted = await repo.find(21, 20)
    expect(accepted?.props.status).toBe('accepted')

    accepted!.remove(20)
    await repo.save(accepted!)
    expect(await repo.find(20, 21)).toBeNull()
  })

  it('a second concurrent insert for the same pair (same requester) upserts instead of throwing', async () => {
    await graphFixture(db)
    const repo = new DrizzleFriendshipRepository(db)
    const a = Friendship.request(22, 23)
    const b = Friendship.request(22, 23)
    const outcomes = await Promise.all([repo.save(a), repo.save(b)])
    const found = await repo.find(22, 23)
    expect(found?.props.status).toBe('pending')
    // Same requester on both sides is not the mutual-race shape (the SQL's `mutualRace` guard
    // requires a *different* requester at conflict time), so this is a plain insert + overwrite.
    expect(outcomes.toSorted()).toEqual(['inserted', 'updated'])
  })

  it('a genuine mutual race (opposite-direction requests) settles on one accepted row: one insert, one raced_accepted', async () => {
    await graphFixture(db)
    const repo = new DrizzleFriendshipRepository(db)
    const a = Friendship.request(24, 25)
    const b = Friendship.request(25, 24)
    const outcomes = await Promise.all([repo.save(a), repo.save(b)])
    expect(outcomes.toSorted()).toEqual(['inserted', 'raced_accepted'])

    const rows = await db.execute(
      sql`select status from friendships where user_lo = 24 and user_hi = 25`,
    )
    expect(rows.length).toBe(1)
    expect(rows[0]?.status).toBe('accepted')
  })
})

describe('DrizzleFollowRepository', () => {
  it('adds and removes follow rows idempotently', async () => {
    await graphFixture(db)
    const repo = new DrizzleFollowRepository(db)
    await repo.add(20, { type: 'user', id: 21 })
    await repo.add(20, { type: 'user', id: 21 }) // idempotent
    const rm = new DrizzleSocialReadModel(db)
    expect((await rm.followers(21)).items.map((u) => u.id)).toContain(20)
    await repo.remove(20, { type: 'user', id: 21 })
    expect((await rm.followers(21)).items.map((u) => u.id)).not.toContain(20)
  })
})

describe('DrizzleCommunityRepository', () => {
  it('saves a new community, then diffs membership on subsequent saves', async () => {
    await graphFixture(db)
    const repo = new DrizzleCommunityRepository(db)
    const c = Community.create({
      ownerId: 20,
      name: 'Музыка',
      screenName: 'music_club',
      topic: 'music',
      description: null,
    })
    const saved = await repo.save(c)
    expect(saved.props.id).toBeGreaterThan(0)

    const reloaded = await repo.findById(saved.props.id as number)
    expect(reloaded?.roleOf(20)).toBe('admin')

    reloaded!.join(21)
    await repo.save(reloaded!)
    const afterJoin = await repo.findByScreenName('music_club')
    expect(afterJoin?.roleOf(21)).toBe('member')
    expect(afterJoin?.membersCount()).toBe(2)

    afterJoin!.leave(21)
    await repo.save(afterJoin!)
    const afterLeave = await repo.findByScreenName('music_club')
    expect(afterLeave?.roleOf(21)).toBeNull()
    expect(afterLeave?.membersCount()).toBe(1)
  })

  it('a failing member insert rolls back the whole save, leaving members_count unchanged', async () => {
    await graphFixture(db)
    const repo = new DrizzleCommunityRepository(db)
    const c = Community.create({
      ownerId: 20,
      name: 'Спорт',
      screenName: 'sport_club',
      topic: 'sport',
      description: null,
    })
    const saved = await repo.save(c)

    const reloaded = await repo.findById(saved.props.id as number)
    reloaded!.join(999999) // no such user — violates community_members' FK on user_id
    await expect(repo.save(reloaded!)).rejects.toThrow()

    const after = await repo.findById(saved.props.id as number)
    expect(after?.membersCount()).toBe(1)
    expect(after?.roleOf(999999)).toBeNull()
    const [row] = await db
      .select({ membersCount: communities.membersCount })
      .from(communities)
      .where(eq(communities.id, saved.props.id as number))
    expect(row?.membersCount).toBe(1)
  })
})

describe('DrizzleSuggestionHider', () => {
  it('hides a suggestion so it is excluded from PYMK results', async () => {
    await graphFixture(db, { pymk: true })
    const hider = new DrizzleSuggestionHider(db)
    const rm = new DrizzleSocialReadModel(db)
    expect((await rm.suggestions(1)).map((x) => x.id)).toContain(11)
    await hider.hide(1, 11)
    expect((await rm.suggestions(1)).map((x) => x.id)).not.toContain(11)
  })
})

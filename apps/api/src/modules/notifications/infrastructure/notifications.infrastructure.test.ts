import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { sql } from 'drizzle-orm'
import { testDb, truncateAll } from '../../../../test/helpers/db'
import type { Db } from '../../../db/client'
import { users } from '../../../db/schema'
import { DrizzleNotificationReadModel } from './drizzle-notification-read-model'
import { DrizzleNotificationRepository } from './drizzle-notification-repository'

let db: Db
beforeAll(async () => {
  db = await testDb()
})
beforeEach(async () => {
  await truncateAll(db)
  // Minimal users so `actorId` foreign keys and the read model's join have something to join to.
  await db.insert(users).values([
    {
      id: 1,
      login: 'user1',
      passwordHash: 'x',
      firstName: 'Имя1',
      lastName: 'Фамилия1',
      screenName: 'u1',
      city: 'Москва',
    },
    {
      id: 2,
      login: 'user2',
      passwordHash: 'x',
      firstName: 'Имя2',
      lastName: 'Фамилия2',
      screenName: 'u2',
      city: 'Казань',
    },
  ])
  await db.execute(sql`select setval(pg_get_serial_sequence('users','id'), 2)`)
})
afterAll(async () => {
  await db.$client.close()
})

describe('DrizzleNotificationRepository + DrizzleNotificationReadModel', () => {
  it('insert two, unread count 2, markRead upto the first leaves 1, list joins actor fields', async () => {
    const repo = new DrizzleNotificationRepository(db)
    const read = new DrizzleNotificationReadModel(db)

    await repo.insert([{ userId: 1, kind: 'friend_request', actorId: 2 }])
    await repo.insert([{ userId: 1, kind: 'friend_accepted', actorId: 2 }])

    expect(await read.unreadCount(1)).toBe(2)

    const page = await read.list(1, null)
    expect(page.items).toHaveLength(2)
    expect(page.nextCursor).toBeNull()
    // ordered by (created_at, id) desc — the second-inserted row (friend_accepted) comes first
    expect(page.items[0]).toMatchObject({
      kind: 'friend_accepted',
      actor: {
        id: 2,
        firstName: 'Имя2',
        lastName: 'Фамилия2',
        screenName: 'u2',
        city: 'Казань',
        isVerified: false,
      },
    })
    expect(page.items[1]).toMatchObject({ kind: 'friend_request', actor: { id: 2 } })
    expect(page.items[0]?.readAt).toBeNull()

    const firstId = Math.min(...page.items.map((n) => n.id))
    await repo.markRead(1, firstId)

    expect(await read.unreadCount(1)).toBe(1)
    const afterRead = await read.list(1, null)
    const stillUnread = afterRead.items.filter((n) => n.readAt === null)
    expect(stillUnread).toHaveLength(1)
    expect(stillUnread[0]?.id).not.toBe(firstId)
  })

  it('a null actorId yields actor: null (left join, no user row required)', async () => {
    const repo = new DrizzleNotificationRepository(db)
    const read = new DrizzleNotificationReadModel(db)
    await repo.insert([{ userId: 1, kind: 'new_follower', actorId: null }])
    const page = await read.list(1, null)
    expect(page.items[0]).toMatchObject({ kind: 'new_follower', actor: null })
  })

  it('markRead only affects the given user and never re-reads an already-read row', async () => {
    const repo = new DrizzleNotificationRepository(db)
    const read = new DrizzleNotificationReadModel(db)
    await repo.insert([{ userId: 2, kind: 'friend_request', actorId: 1 }])
    await repo.markRead(1, 999999) // wrong user — must not touch user 2's row
    expect(await read.unreadCount(2)).toBe(1)
  })

  it('paginates by (created_at, id) desc: 25 rows split into 20 then 5', async () => {
    const repo = new DrizzleNotificationRepository(db)
    const read = new DrizzleNotificationReadModel(db)
    // One insert() call per row (not one batched array) so each gets its own `now()` snapshot —
    // Postgres timestamptz has microsecond precision but the kernel cursor only round-trips
    // milliseconds, so 25 rows sharing one statement's exact timestamp would collide on the
    // cursor boundary. Real producers only ever insert one row per user per event anyway.
    for (let i = 0; i < 25; i++) {
      await repo.insert([{ userId: 1, kind: 'friend_request', actorId: null }])
    }
    const a = await read.list(1, null)
    expect(a.items).toHaveLength(20)
    expect(a.nextCursor).not.toBeNull()
    const b = await read.list(1, a.nextCursor)
    expect(b.items).toHaveLength(5)
    expect(b.nextCursor).toBeNull()
    const seen = new Set([...a.items, ...b.items].map((n) => n.id))
    expect(seen.size).toBe(25)
  })

  it('regression: 25 rows batch-inserted in ONE insert (same timestamp) still paginate without gaps', async () => {
    const repo = new DrizzleNotificationRepository(db)
    const read = new DrizzleNotificationReadModel(db)
    // A single insert() call batches all 25 rows into one INSERT statement, so every row shares
    // the exact same `now()` value down to the microsecond — Postgres `timestamptz` has
    // microsecond precision but the keyset cursor only round-trips milliseconds (`kernel/cursor.ts`
    // encodes `toISOString()`, which is millisecond-precision). Comparing the raw column against a
    // millisecond-truncated cursor would then incorrectly exclude rows sharing that millisecond,
    // dropping them between page 1 and page 2. `date_trunc('milliseconds', ...)` in both the WHERE
    // and ORDER BY of `DrizzleNotificationReadModel.list` fixes this.
    await repo.insert(
      Array.from({ length: 25 }, () => ({
        userId: 1,
        kind: 'friend_request' as const,
        actorId: null,
      })),
    )
    const a = await read.list(1, null)
    expect(a.items).toHaveLength(20)
    expect(a.nextCursor).not.toBeNull()
    const b = await read.list(1, a.nextCursor)
    expect(b.items).toHaveLength(5)
    expect(b.nextCursor).toBeNull()
    const seen = new Set([...a.items, ...b.items].map((n) => n.id))
    expect(seen.size).toBe(25)
  })
})

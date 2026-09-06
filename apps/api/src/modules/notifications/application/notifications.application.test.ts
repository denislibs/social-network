import { beforeEach, describe, expect, it } from 'bun:test'
import { EventBus } from '../../../kernel/event-bus'
import { KERNEL } from '../../../kernel/tokens'
import { MarkNotificationsRead } from './commands/mark-read'
import { NOTIFICATIONS } from './ports'
import { GetNotifications } from './queries/get-notifications'
import { GetUnreadCount } from './queries/get-unread-count'
import { registerNotificationsHandlers } from './register'
import { subscribeGraphNotifications } from './subscribers/graph-subscriber'
import { createNotificationsTestContainer } from './testing/container'
import type { InMemoryNotifications } from './testing/fakes'

let c: ReturnType<typeof createNotificationsTestContainer>
let events: EventBus
const exec = <T>(cmd: { __result: T }) =>
  c.get(KERNEL.CommandBus).execute(cmd as never) as Promise<T>
const ask = <T>(q: { __result: T }) => c.get(KERNEL.QueryBus).ask(q as never) as Promise<T>

beforeEach(async () => {
  events = new EventBus()
  c = createNotificationsTestContainer({ events })
  await registerNotificationsHandlers(c)
  subscribeGraphNotifications(events, c.get(NOTIFICATIONS.Repository))
})

describe('subscribeGraphNotifications', () => {
  it('FriendRequested inserts a friend_request row for the addressee, actor is the requester', async () => {
    await events.publish([
      {
        type: 'FriendRequested',
        occurredAt: new Date(),
        payload: { requesterId: 1, addresseeId: 2 },
      },
    ])
    const page = await ask(new GetNotifications(2))
    expect(page.items).toHaveLength(1)
    expect(page.items[0]).toMatchObject({ kind: 'friend_request', actor: { id: 1 } })
    expect((await ask(new GetNotifications(1))).items).toHaveLength(0)
  })

  it('FriendshipAccepted inserts a friend_accepted row for the requester (not the acceptor)', async () => {
    // userLo=1, userHi=2, acceptedBy=2 → recipient is 1 (the one who is not acceptedBy)
    await events.publish([
      {
        type: 'FriendshipAccepted',
        occurredAt: new Date(),
        payload: { userLo: 1, userHi: 2, acceptedBy: 2 },
      },
    ])
    const page = await ask(new GetNotifications(1))
    expect(page.items).toHaveLength(1)
    expect(page.items[0]).toMatchObject({ kind: 'friend_accepted', actor: { id: 2 } })
    expect((await ask(new GetNotifications(2))).items).toHaveLength(0)
  })

  it('FriendRequestDeclined and FriendshipRemoved insert nothing', async () => {
    await events.publish([
      {
        type: 'FriendRequestDeclined',
        occurredAt: new Date(),
        payload: { requesterId: 1, addresseeId: 2 },
      },
      { type: 'FriendshipRemoved', occurredAt: new Date(), payload: { removedBy: 1, other: 2 } },
    ])
    expect((await ask(new GetNotifications(1))).items).toHaveLength(0)
    expect((await ask(new GetNotifications(2))).items).toHaveLength(0)
  })
})

describe('MarkNotificationsRead', () => {
  it('marks only id <= uptoId and returns the new unread count', async () => {
    const repo = c.get(NOTIFICATIONS.Repository) as InMemoryNotifications
    await repo.insert([
      { userId: 5, kind: 'friend_request', actorId: 1 },
      { userId: 5, kind: 'friend_request', actorId: 2 },
      { userId: 5, kind: 'friend_request', actorId: 3 },
    ])
    const ids = (await ask(new GetNotifications(5))).items
      .map((n) => n.id)
      .toSorted((a, b) => a - b)
    expect(await ask(new GetUnreadCount(5))).toEqual({ count: 3 })

    const uptoId = ids[1] as number // marks the two oldest-id rows read, leaves the newest unread
    const result = await exec(new MarkNotificationsRead({ me: 5, uptoId }))

    expect(result).toEqual({ count: 1 })
    expect(await ask(new GetUnreadCount(5))).toEqual({ count: 1 })

    // re-marking read up to the same id is a no-op, not a double-decrement
    expect(await exec(new MarkNotificationsRead({ me: 5, uptoId }))).toEqual({ count: 1 })
  })

  it('does not affect notifications belonging to a different user', async () => {
    const repo = c.get(NOTIFICATIONS.Repository) as InMemoryNotifications
    await repo.insert([{ userId: 6, kind: 'friend_request', actorId: 1 }])
    const [row] = (await ask(new GetNotifications(6))).items
    await exec(new MarkNotificationsRead({ me: 999, uptoId: row!.id }))
    expect(await ask(new GetUnreadCount(6))).toEqual({ count: 1 })
  })
})

describe('GetNotifications pagination', () => {
  it('paginates 25 rows into a 20-item page then a 5-item page', async () => {
    const repo = c.get(NOTIFICATIONS.Repository) as InMemoryNotifications
    await repo.insert(
      Array.from({ length: 25 }, () => ({
        userId: 9,
        kind: 'friend_request' as const,
        actorId: null,
      })),
    )
    const a = await ask(new GetNotifications(9))
    expect(a.items).toHaveLength(20)
    expect(a.nextCursor).not.toBeNull()

    const b = await ask(new GetNotifications(9, a.nextCursor ?? undefined))
    expect(b.items).toHaveLength(5)
    expect(b.nextCursor).toBeNull()

    const seen = new Set([...a.items, ...b.items].map((n) => n.id))
    expect(seen.size).toBe(25)
  })
})

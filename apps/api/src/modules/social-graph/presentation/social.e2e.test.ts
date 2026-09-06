import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { sql } from 'drizzle-orm'
import { cookieFrom, createTestApp, type TestApp } from '../../../../test/helpers/app'
import { truncateAll } from '../../../../test/helpers/db'
import type { Db } from '../../../db/client'
import { friendships, users } from '../../../db/schema'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
beforeEach(async () => {
  await truncateAll(t.db)
  await t.redis.flushdb()
})
afterAll(async () => {
  await t.close()
})

function req(
  method: string,
  path: string,
  opts: { body?: unknown; cookie?: string | undefined } = {},
) {
  const init: RequestInit = { method, headers: opts.cookie ? { cookie: opts.cookie } : {} }
  if (opts.body !== undefined) {
    init.headers = { ...init.headers, 'content-type': 'application/json' }
    init.body = JSON.stringify(opts.body)
  }
  return t.app.handle(new Request(`http://localhost/api/v1${path}`, init))
}
const get = (path: string, cookie?: string | undefined) => req('GET', path, { cookie })
const post = (path: string, body: unknown = {}, cookie?: string | undefined) =>
  req('POST', path, { body, cookie })
const patch = (path: string, body: unknown, cookie?: string | undefined) =>
  req('PATCH', path, { body, cookie })
const del = (path: string, cookie?: string | undefined) => req('DELETE', path, { cookie })
const kindsOf = async (res: Response) =>
  ((await res.json()) as { items: { kind: string }[] }).items.map((i) => i.kind)

async function registerUser(
  login: string,
  firstName = 'Имя',
  lastName = 'Фамилия',
): Promise<{ id: number; cookie: string }> {
  const res = await post('/auth/register', { login, password: 'password123', firstName, lastName })
  const body = (await res.json()) as { user: { id: number } }
  return { id: body.user.id, cookie: cookieFrom(res) }
}

/** Seeds `count` accepted friendships for `userId` via direct SQL, bypassing the domain layer —
 * a fixture for exercising HTTP pagination, not a test of friendship semantics. */
async function seedFriends(db: Db, userId: number, count: number, startId: number): Promise<void> {
  const ids = Array.from({ length: count }, (_, i) => startId + i)
  await db.insert(users).values(
    ids.map((id) => ({
      id,
      login: `friend${id}`,
      passwordHash: 'x',
      firstName: `Friend${id}`,
      lastName: `Test${id}`,
    })),
  )
  await db.execute(
    sql`select setval(pg_get_serial_sequence('users','id'), (select max(id) from users))`,
  )
  const base = new Date('2026-01-01T00:00:00Z')
  await db.insert(friendships).values(
    ids.map((id, i) => ({
      userLo: Math.min(userId, id),
      userHi: Math.max(userId, id),
      status: 'accepted' as const,
      requesterId: userId,
      createdAt: new Date(base.getTime() + i * 1000),
      acceptedAt: new Date(base.getTime() + i * 1000),
    })),
  )
}

describe('social graph + profile e2e', () => {
  it('request → outgoing, incoming request list, accept → friends, profile shows relation + counters', async () => {
    const a = await registerUser('alice')
    const b = await registerUser('bob')

    const sent = await post(`/friends/${b.id}/request`, {}, a.cookie)
    expect(sent.status).toBe(200)
    expect(await sent.json()).toEqual({ relation: 'outgoing' })

    const bCountersAfterRequest = await get('/me/counters', b.cookie)
    expect(bCountersAfterRequest.status).toBe(200)
    expect(await bCountersAfterRequest.json()).toMatchObject({ incomingRequests: 1 })

    const incoming = await get('/me/friends/requests?dir=incoming', b.cookie)
    expect(incoming.status).toBe(200)
    const incomingBody = (await incoming.json()) as { items: { id: number }[] }
    expect(incomingBody.items.map((u) => u.id)).toEqual([a.id])

    const accepted = await post(`/friends/${a.id}/accept`, {}, b.cookie)
    expect(accepted.status).toBe(200)
    expect(await accepted.json()).toEqual({ relation: 'friends' })

    const bCountersAfterAccept = await get('/me/counters', b.cookie)
    expect(await bCountersAfterAccept.json()).toMatchObject({ friends: 1, incomingRequests: 0 })

    const profile = await get(`/users/id${a.id}`, b.cookie)
    expect(profile.status).toBe(200)
    const profileBody = (await profile.json()) as {
      user: { relation: string; counters: { friends: number } }
    }
    expect(profileBody.user.relation).toBe('friends')
    expect(profileBody.user.counters.friends).toBe(1)
  })

  it('mutual race: concurrent requests from both sides settle on exactly one accepted row', async () => {
    const c = await registerUser('carol')
    const d = await registerUser('dave')

    const [r1, r2] = await Promise.all([
      post(`/friends/${d.id}/request`, {}, c.cookie),
      post(`/friends/${c.id}/request`, {}, d.cookie),
    ])
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)

    const rows = await t.db.execute(
      sql`select status from friendships where (user_lo = ${Math.min(c.id, d.id)} and user_hi = ${Math.max(c.id, d.id)})`,
    )
    expect(rows.length).toBe(1)
    expect(rows[0]?.status).toBe('accepted')

    const profile = await get(`/users/id${d.id}`, c.cookie)
    const body = (await profile.json()) as { user: { relation: string } }
    expect(body.user.relation).toBe('friends')

    // Both concurrent requests publish their own FriendRequested (2 total across the pair), and
    // exactly one side of the race publishes the synthetic FriendshipAccepted (1 total) — which
    // one depends on request-arrival order, which Promise.all doesn't pin down, so assert counts
    // instead of which specific user got which notification.
    const [cNotifs, dNotifs] = await Promise.all([
      get('/me/notifications', c.cookie),
      get('/me/notifications', d.cookie),
    ])
    const allKinds = [...(await kindsOf(cNotifs)), ...(await kindsOf(dNotifs))]
    expect(allKinds.filter((k) => k === 'friend_request')).toHaveLength(2)
    expect(allKinds.filter((k) => k === 'friend_accepted')).toHaveLength(1)
  })

  it('PATCH /me/profile: reserved screen name 422, taken 409, success then resolves by screen name', async () => {
    const a = await registerUser('erin')
    const b = await registerUser('frank')

    const reserved = await patch('/me/profile', { screenName: 'feed' }, a.cookie)
    expect(reserved.status).toBe(422)
    expect(await reserved.json()).toMatchObject({ error: { code: 'screen_name_reserved' } })

    const bTaken = await patch('/me/profile', { screenName: 'erintaken' }, b.cookie)
    expect(bTaken.status).toBe(200)

    const taken = await patch('/me/profile', { screenName: 'erintaken' }, a.cookie)
    expect(taken.status).toBe(409)
    expect(await taken.json()).toMatchObject({ error: { code: 'screen_name_taken' } })

    const success = await patch('/me/profile', { screenName: 'erin_ok' }, a.cookie)
    expect(success.status).toBe(200)
    const successBody = (await success.json()) as { user: { screenName: string } }
    expect(successBody.user.screenName).toBe('erin_ok')

    const resolved = await get('/users/erin_ok', a.cookie)
    expect(resolved.status).toBe(200)
    const resolvedBody = (await resolved.json()) as { user: { id: number } }
    expect(resolvedBody.user.id).toBe(a.id)
  })

  it('communities: create, join, member count, last admin cannot leave', async () => {
    const a = await registerUser('gina', 'Zvezda', 'Testova')
    const b = await registerUser('harry')

    const created = await post(
      '/communities',
      { name: 'Zvezda Club', screenName: 'zvezdaclub', topic: 'it', description: null },
      a.cookie,
    )
    expect(created.status).toBe(201)
    const createdBody = (await created.json()) as {
      community: { id: number; membersCount: number; membership: string }
    }
    expect(createdBody.community.membersCount).toBe(1)
    expect(createdBody.community.membership).toBe('admin')
    const communityId = createdBody.community.id

    const joined = await post(`/communities/${communityId}/join`, {}, b.cookie)
    expect(joined.status).toBe(200)
    expect(await joined.json()).toEqual({ membership: 'member', isFollowing: true })

    const afterJoin = await get(`/communities/${communityId}`, a.cookie)
    const afterJoinBody = (await afterJoin.json()) as { community: { membersCount: number } }
    expect(afterJoinBody.community.membersCount).toBe(2)

    // `:id` also resolves by screen name (the memoirist param-name-collision rename in the prior
    // task's report — see the deviations section — must not have broken this path).
    const byScreenName = await get('/communities/zvezdaclub', a.cookie)
    expect(byScreenName.status).toBe(200)
    const byScreenNameBody = (await byScreenName.json()) as { community: { id: number } }
    expect(byScreenNameBody.community.id).toBe(communityId)

    const leftAsLastAdmin = await del(`/communities/${communityId}/join`, a.cookie)
    expect(leftAsLastAdmin.status).toBe(409)
    expect(await leftAsLastAdmin.json()).toMatchObject({ error: { code: 'last_admin' } })

    const search = await get('/search?q=Zvezda', a.cookie)
    expect(search.status).toBe(200)
    const searchBody = (await search.json()) as {
      users: { id: number }[]
      communities: { screenName: string }[]
    }
    expect(searchBody.users.map((u) => u.id)).toContain(a.id)
    expect(searchBody.communities.map((c) => c.screenName)).toContain('zvezdaclub')
  })

  it('notifications: friend_request then friend_accepted, unread counts, mark read', async () => {
    const a = await registerUser('ivan')
    const b = await registerUser('julia')

    await post(`/friends/${b.id}/request`, {}, a.cookie)
    await post(`/friends/${a.id}/accept`, {}, b.cookie)

    const bUnread = await get('/me/notifications/unread-count', b.cookie)
    expect(await bUnread.json()).toEqual({ count: 1 })
    const bList = await get('/me/notifications', b.cookie)
    const bListBody = (await bList.json()) as { items: { kind: string }[] }
    expect(bListBody.items[0]?.kind).toBe('friend_request')

    const aUnread = await get('/me/notifications/unread-count', a.cookie)
    expect(await aUnread.json()).toEqual({ count: 1 })
    const aList = await get('/me/notifications', a.cookie)
    const aListBody = (await aList.json()) as { items: { kind: string; id: number }[] }
    expect(aListBody.items[0]?.kind).toBe('friend_accepted')

    const uptoId = aListBody.items[0]?.id as number
    const marked = await post('/me/notifications/read', { uptoId }, a.cookie)
    expect(marked.status).toBe(200)
    expect(await marked.json()).toEqual({ count: 0 })
  })

  it('pagination: 25 friends paginate 20 then 5, bad cursor → 422 bad_cursor', async () => {
    const a = await registerUser('kevin')
    await seedFriends(t.db, a.id, 25, 1000)

    const page1 = await get(`/users/${a.id}/friends`, a.cookie)
    expect(page1.status).toBe(200)
    const page1Body = (await page1.json()) as { items: unknown[]; nextCursor: string | null }
    expect(page1Body.items).toHaveLength(20)
    expect(page1Body.nextCursor).not.toBeNull()

    const page2 = await get(
      `/users/${a.id}/friends?cursor=${encodeURIComponent(page1Body.nextCursor as string)}`,
      a.cookie,
    )
    expect(page2.status).toBe(200)
    const page2Body = (await page2.json()) as { items: unknown[]; nextCursor: string | null }
    expect(page2Body.items).toHaveLength(5)
    expect(page2Body.nextCursor).toBeNull()

    const badCursor = await get(`/users/${a.id}/friends?cursor=not-a-valid-cursor`, a.cookie)
    expect(badCursor.status).toBe(422)
    expect(await badCursor.json()).toMatchObject({ error: { code: 'bad_cursor' } })
  })

  it('GET /handles/:handle resolves users and communities', async () => {
    const a = await registerUser('laura')
    const created = await post(
      '/communities',
      { name: 'Handle Club', screenName: 'handleclub', topic: 'games', description: null },
      a.cookie,
    )
    const createdBody = (await created.json()) as { community: { id: number } }

    const userHandle = await get(`/handles/id${a.id}`, a.cookie)
    expect(userHandle.status).toBe(200)
    expect(await userHandle.json()).toEqual({ kind: 'user', id: a.id })

    const communityHandle = await get('/handles/handleclub', a.cookie)
    expect(communityHandle.status).toBe(200)
    expect(await communityHandle.json()).toEqual({
      kind: 'community',
      id: createdBody.community.id,
    })
  })
})

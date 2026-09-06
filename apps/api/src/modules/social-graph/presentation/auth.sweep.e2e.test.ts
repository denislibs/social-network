import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { count, eq } from 'drizzle-orm'
import { cookieFrom, createTestApp, type TestApp } from '../../../../test/helpers/app'
import { truncateAll } from '../../../../test/helpers/db'
import { communities, friendships } from '../../../db/schema'

let t: TestApp
let communityScreenName: string
let userId: number

beforeAll(async () => {
  t = await createTestApp()
  await truncateAll(t.db)
  await t.redis.flushdb()
  const registered = await call('POST', '/auth/register', {
    body: {
      login: 'sweep',
      password: 'password123',
      firstName: 'Имя',
      lastName: 'Фамилия',
    },
  })
  const registeredBody = (await registered.json()) as { user: { id: number } }
  userId = registeredBody.user.id
  const cookie = cookieFrom(registered)
  communityScreenName = 'sweepclub'
  await call('POST', '/communities', {
    cookie,
    body: {
      name: 'Sweep Club',
      screenName: communityScreenName,
      topic: 'it',
      description: null,
    },
  })
})
afterAll(async () => {
  await t.close()
})

function call(
  method: string,
  path: string,
  opts: { body?: unknown; cookie?: string } = {},
): Promise<Response> {
  const init: RequestInit = { method, headers: opts.cookie ? { cookie: opts.cookie } : {} }
  if (opts.body !== undefined) {
    init.headers = { ...init.headers, 'content-type': 'application/json' }
    init.body = JSON.stringify(opts.body)
  }
  return t.app.handle(new Request(`http://localhost/api/v1${path}`, init))
}

type Route = { method: string; path: string; body?: unknown }

/**
 * Every route behind the `auth` macro across social-graph, notifications and identity's profile
 * surface. Bodies and query strings are deliberately *valid*: Elysia validates the request before
 * the auth resolver runs, so an invalid one would answer 422 and quietly hide a missing auth
 * guard behind a green assertion.
 */
const PROTECTED: Route[] = [
  // identity
  { method: 'GET', path: '/me' },
  { method: 'PATCH', path: '/me/profile', body: { status: 'hi' } },
  { method: 'POST', path: '/auth/logout' },
  { method: 'POST', path: '/auth/logout-all' },
  // social-graph — friends
  { method: 'GET', path: '/users/1/friends' },
  { method: 'GET', path: '/users/1/followers' },
  { method: 'GET', path: '/me/friends/requests?dir=incoming' },
  { method: 'GET', path: '/me/counters' },
  { method: 'GET', path: '/me/friends/suggestions' },
  { method: 'POST', path: '/friends/1/request', body: {} },
  { method: 'POST', path: '/friends/1/accept', body: {} },
  { method: 'POST', path: '/friends/1/decline', body: {} },
  { method: 'DELETE', path: '/friends/1' },
  { method: 'POST', path: '/me/friends/suggestions/1/hide', body: {} },
  // social-graph — communities
  { method: 'GET', path: '/me/communities' },
  { method: 'GET', path: '/communities/1/members' },
  {
    method: 'POST',
    path: '/communities',
    body: { name: 'Anon Club', screenName: 'anonclub', topic: 'it', description: null },
  },
  { method: 'POST', path: '/communities/1/join', body: {} },
  { method: 'DELETE', path: '/communities/1/join' },
  { method: 'POST', path: '/communities/1/follow', body: {} },
  { method: 'DELETE', path: '/communities/1/follow' },
  // social-graph — discovery
  { method: 'GET', path: '/search?q=ab' },
  { method: 'GET', path: '/handles/sweep' },
  // notifications
  { method: 'GET', path: '/me/notifications' },
  { method: 'GET', path: '/me/notifications/unread-count' },
  { method: 'POST', path: '/me/notifications/read', body: { uptoId: 1 } },
]

describe('auth sweep', () => {
  it('every protected route answers 401 unauthorized without a session cookie', async () => {
    const actual: string[] = []
    for (const r of PROTECTED) {
      const res = await call(r.method, r.path, r.body === undefined ? {} : { body: r.body })
      const body = (await res.json().catch(() => ({}))) as { error?: { code?: string } }
      actual.push(`${r.method} ${r.path} → ${res.status} ${body.error?.code}`)
    }
    expect(actual).toEqual(PROTECTED.map((r) => `${r.method} ${r.path} → 401 unauthorized`))
  })

  it('the anonymous sweep left no state behind', async () => {
    // The 401s above are only worth something if they fire *before* the handler runs. The sweep
    // tried to create `anonclub`, send a friend request and mark notifications read; none of it
    // may have landed.
    const [communityRow] = await t.db
      .select({ n: count() })
      .from(communities)
      .where(eq(communities.screenName, 'anonclub'))
    expect(communityRow?.n).toBe(0)
    const [friendshipRow] = await t.db.select({ n: count() }).from(friendships)
    expect(friendshipRow?.n).toBe(0)
  })

  it('public reads stay public: profile and community by screen name without a cookie', async () => {
    const profile = await call('GET', `/users/id${userId}`)
    expect(profile.status).toBe(200)
    const profileBody = (await profile.json()) as { user: { id: number; login?: string } }
    expect(profileBody.user.id).toBe(userId)
    expect(profileBody.user).not.toHaveProperty('login')

    const community = await call('GET', `/communities/${communityScreenName}`)
    expect(community.status).toBe(200)
    const communityBody = (await community.json()) as {
      community: { screenName: string; membership: string; isFollowing: boolean }
    }
    expect(communityBody.community.screenName).toBe(communityScreenName)
    // No viewer → no membership/following state leaks out.
    expect(communityBody.community.membership).toBe('none')
    expect(communityBody.community.isFollowing).toBe(false)
  })
})

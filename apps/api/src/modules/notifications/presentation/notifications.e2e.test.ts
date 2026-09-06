import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { cookieFrom, createTestApp, type TestApp } from '../../../../test/helpers/app'
import { truncateAll } from '../../../../test/helpers/db'
import { notifications } from '../../../db/schema'

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

async function registerUser(login: string): Promise<{ id: number; cookie: string }> {
  const res = await post('/auth/register', {
    login,
    password: 'password123',
    firstName: 'Имя',
    lastName: 'Фамилия',
  })
  const body = (await res.json()) as { user: { id: number } }
  return { id: body.user.id, cookie: cookieFrom(res) }
}

describe('notifications e2e', () => {
  it('unread-count is 0 with no notifications, requires auth', async () => {
    const a = await registerUser('nadia')
    expect((await get('/me/notifications/unread-count')).status).toBe(401)
    const res = await get('/me/notifications/unread-count', a.cookie)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ count: 0 })
  })

  it('friend_request notification carries the requester as actor', async () => {
    const a = await registerUser('oleg')
    const b = await registerUser('petra')
    await post(`/friends/${b.id}/request`, {}, a.cookie)

    const list = await get('/me/notifications', b.cookie)
    expect(list.status).toBe(200)
    const body = (await list.json()) as {
      items: {
        kind: string
        actor: { id: number; firstName: string } | null
        readAt: string | null
      }[]
    }
    expect(body.items).toHaveLength(1)
    expect(body.items[0]?.kind).toBe('friend_request')
    expect(body.items[0]?.actor?.id).toBe(a.id)
    expect(body.items[0]?.readAt).toBeNull()
  })

  it('mark read is idempotent and only affects the caller', async () => {
    const a = await registerUser('quentin')
    const b = await registerUser('rosa')
    await post(`/friends/${b.id}/request`, {}, a.cookie)

    const list = await get('/me/notifications', b.cookie)
    const body = (await list.json()) as { items: { id: number }[] }
    const uptoId = body.items[0]?.id as number

    const first = await post('/me/notifications/read', { uptoId }, b.cookie)
    expect(await first.json()).toEqual({ count: 0 })
    const second = await post('/me/notifications/read', { uptoId }, b.cookie)
    expect(await second.json()).toEqual({ count: 0 })

    // Marking read as A (who has no notifications) must not error and must not touch B's rows.
    const asA = await post('/me/notifications/read', { uptoId }, a.cookie)
    expect(asA.status).toBe(200)
    expect(await (await get('/me/notifications/unread-count', b.cookie)).json()).toEqual({
      count: 0,
    })
  })

  it('pagination: 25 rows in one insert (shared timestamp) split 20 then 5, no gaps; bad cursor → 422', async () => {
    const a = await registerUser('sasha')
    await t.db.insert(notifications).values(
      Array.from({ length: 25 }, () => ({
        userId: a.id,
        kind: 'new_follower' as const,
        actorId: null,
      })),
    )

    const page1 = await get('/me/notifications', a.cookie)
    const page1Body = (await page1.json()) as { items: { id: number }[]; nextCursor: string | null }
    expect(page1Body.items).toHaveLength(20)
    expect(page1Body.nextCursor).not.toBeNull()

    const page2 = await get(
      `/me/notifications?cursor=${encodeURIComponent(page1Body.nextCursor as string)}`,
      a.cookie,
    )
    const page2Body = (await page2.json()) as { items: { id: number }[]; nextCursor: string | null }
    expect(page2Body.items).toHaveLength(5)
    expect(page2Body.nextCursor).toBeNull()

    const seen = new Set([...page1Body.items, ...page2Body.items].map((n) => n.id))
    expect(seen.size).toBe(25)

    const bad = await get('/me/notifications?cursor=not-a-valid-cursor', a.cookie)
    expect(bad.status).toBe(422)
    expect(await bad.json()).toMatchObject({ error: { code: 'bad_cursor' } })
  })
})

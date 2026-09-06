import { describe, expect, it, vi } from 'vitest'
import { type ApiClient, UnauthorizedBus } from '@/shared/api'
import { EdenNotificationGateway } from './notificationApi'

function fakeApi(): {
  api: ApiClient
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  unreadCountGet: ReturnType<typeof vi.fn>
} {
  const get = vi.fn().mockResolvedValue({ data: null, error: { status: 401, value: {} } })
  const post = vi.fn().mockResolvedValue({ data: null, error: { status: 401, value: {} } })
  const unreadCountGet = vi
    .fn()
    .mockResolvedValue({ data: null, error: { status: 401, value: {} } })
  const api = {
    api: {
      v1: {
        me: {
          notifications: Object.assign(
            { get, read: { post } },
            {
              'unread-count': { get: unreadCountGet },
            },
          ),
        },
      },
    },
  } as unknown as ApiClient
  return { api, get, post, unreadCountGet }
}

describe('EdenNotificationGateway', () => {
  it('unreadCount hits GET /me/notifications/unread-count', async () => {
    const { api, unreadCountGet } = fakeApi()
    unreadCountGet.mockResolvedValue({ data: { count: 3 }, error: null })
    const gateway = new EdenNotificationGateway(api, new UnauthorizedBus())

    await expect(gateway.unreadCount()).resolves.toBe(3)
    expect(unreadCountGet).toHaveBeenCalled()
  })

  it('list passes the cursor only when non-null', async () => {
    const { api, get } = fakeApi()
    get.mockResolvedValue({ data: { items: [], nextCursor: null }, error: null })
    const gateway = new EdenNotificationGateway(api, new UnauthorizedBus())

    await gateway.list(null)
    expect(get).toHaveBeenCalledWith({ query: {} })

    await gateway.list('c1')
    expect(get).toHaveBeenCalledWith({ query: { cursor: 'c1' } })
  })

  it('markRead POSTs /me/notifications/read with uptoId and returns the count', async () => {
    const { api, post } = fakeApi()
    post.mockResolvedValue({ data: { count: 5 }, error: null })
    const gateway = new EdenNotificationGateway(api, new UnauthorizedBus())

    await expect(gateway.markRead(10)).resolves.toBe(5)
    expect(post).toHaveBeenCalledWith({ uptoId: 10 })
  })

  it('emits on the bus on a 401', async () => {
    const { api } = fakeApi()
    const bus = new UnauthorizedBus()
    const onUnauthorized = vi.fn()
    bus.on(onUnauthorized)
    const gateway = new EdenNotificationGateway(api, bus)

    await expect(gateway.unreadCount()).rejects.toThrow()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})

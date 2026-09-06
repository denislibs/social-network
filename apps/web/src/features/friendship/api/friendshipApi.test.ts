import { describe, expect, it, vi } from 'vitest'
import { type ApiClient, UnauthorizedBus } from '@/shared/api'
import { EdenFriendshipGateway } from './friendshipApi'

function fakeApi(): {
  api: ApiClient
  post: ReturnType<typeof vi.fn>
  del: ReturnType<typeof vi.fn>
  friends: ReturnType<typeof vi.fn>
} {
  const post = vi.fn().mockResolvedValue({ data: null, error: { status: 401, value: {} } })
  const del = vi.fn().mockResolvedValue({ data: null, error: { status: 401, value: {} } })
  const friends = vi.fn((_p: { id: number }) => ({
    request: { post },
    accept: { post },
    decline: { post },
    delete: del,
  }))
  const api = { api: { v1: { friends } } } as unknown as ApiClient
  return { api, post, del, friends }
}

describe('EdenFriendshipGateway', () => {
  it('request POSTs /friends/:id/request and returns the relation', async () => {
    const { api, post, friends } = fakeApi()
    post.mockResolvedValue({ data: { relation: 'outgoing' }, error: null })
    const gateway = new EdenFriendshipGateway(api, new UnauthorizedBus())

    await expect(gateway.request(5)).resolves.toBe('outgoing')
    expect(friends).toHaveBeenCalledWith({ id: 5 })
  })

  it('accept POSTs /friends/:id/accept and returns the relation', async () => {
    const { api, post } = fakeApi()
    post.mockResolvedValue({ data: { relation: 'friends' }, error: null })
    const gateway = new EdenFriendshipGateway(api, new UnauthorizedBus())

    await expect(gateway.accept(5)).resolves.toBe('friends')
  })

  it('decline POSTs /friends/:id/decline and returns the relation', async () => {
    const { api, post } = fakeApi()
    post.mockResolvedValue({ data: { relation: 'none' }, error: null })
    const gateway = new EdenFriendshipGateway(api, new UnauthorizedBus())

    await expect(gateway.decline(5)).resolves.toBe('none')
  })

  it('remove DELETEs /friends/:id and returns the relation', async () => {
    const { api, del } = fakeApi()
    del.mockResolvedValue({ data: { relation: 'none' }, error: null })
    const gateway = new EdenFriendshipGateway(api, new UnauthorizedBus())

    await expect(gateway.remove(5)).resolves.toBe('none')
  })

  it('emits on the bus on a 401', async () => {
    const { api } = fakeApi()
    const bus = new UnauthorizedBus()
    const onUnauthorized = vi.fn()
    bus.on(onUnauthorized)
    const gateway = new EdenFriendshipGateway(api, bus)

    await expect(gateway.request(5)).rejects.toThrow()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})

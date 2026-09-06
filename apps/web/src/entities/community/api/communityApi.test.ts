import { describe, expect, it, vi } from 'vitest'
import { type ApiClient, UnauthorizedBus } from '@/shared/api'
import { EdenCommunityGateway } from './communityApi'

function fakeApi(): {
  api: ApiClient
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  del: ReturnType<typeof vi.fn>
  communities: ReturnType<typeof vi.fn>
} {
  const get = vi.fn().mockResolvedValue({ data: null, error: { status: 401, value: {} } })
  const post = vi.fn().mockResolvedValue({ data: null, error: { status: 401, value: {} } })
  const del = vi.fn().mockResolvedValue({ data: null, error: { status: 401, value: {} } })
  const communities = vi.fn((_p: { id: string | number }) => ({
    get,
    members: { get },
    join: { post, delete: del },
    follow: { post, delete: del },
  }))
  const api = {
    api: {
      v1: {
        communities: Object.assign(communities, { post, get }),
        me: { communities: { get } },
        search: { get },
      },
    },
  } as unknown as ApiClient
  return { api, get, post, del, communities }
}

describe('EdenCommunityGateway', () => {
  it('get calls GET /communities/:id with the handle', async () => {
    const { api, get, communities } = fakeApi()
    get.mockResolvedValue({ data: { community: { id: 1, name: 'IT' } }, error: null })
    const gateway = new EdenCommunityGateway(api, new UnauthorizedBus())

    await expect(gateway.get('itclub')).resolves.toEqual({ id: 1, name: 'IT' })
    expect(communities).toHaveBeenCalledWith({ id: 'itclub' })
  })

  it('members passes the cursor only when non-null', async () => {
    const { api, get, communities } = fakeApi()
    get.mockResolvedValue({ data: { items: [], nextCursor: null }, error: null })
    const gateway = new EdenCommunityGateway(api, new UnauthorizedBus())

    await gateway.members(1, null)
    expect(communities).toHaveBeenCalledWith({ id: 1 })
    expect(get).toHaveBeenCalledWith({ query: {} })

    await gateway.members(1, 'c2')
    expect(get).toHaveBeenCalledWith({ query: { cursor: 'c2' } })
  })

  it('mine returns the community list', async () => {
    const { api, get } = fakeApi()
    get.mockResolvedValue({ data: { items: [{ id: 1 }] }, error: null })
    const gateway = new EdenCommunityGateway(api, new UnauthorizedBus())

    await expect(gateway.mine()).resolves.toEqual([{ id: 1 }])
  })

  it('search hits /search?kind=communities and returns the communities array', async () => {
    const { api, get } = fakeApi()
    get.mockResolvedValue({ data: { users: [], communities: [{ id: 2 }] }, error: null })
    const gateway = new EdenCommunityGateway(api, new UnauthorizedBus())

    await expect(gateway.search('it')).resolves.toEqual([{ id: 2 }])
    expect(get).toHaveBeenCalledWith({ query: { q: 'it', kind: 'communities' } })
  })

  it('create POSTs /communities with the input', async () => {
    const { api, post } = fakeApi()
    post.mockResolvedValue({ data: { community: { id: 3, name: 'New' } }, error: null })
    const gateway = new EdenCommunityGateway(api, new UnauthorizedBus())
    const input = { name: 'New', screenName: 'new', topic: 'it' as const, description: null }

    await expect(gateway.create(input)).resolves.toEqual({ id: 3, name: 'New' })
    expect(post).toHaveBeenCalledWith(input)
  })

  it('join POSTs /communities/:id/join', async () => {
    const { api, post, communities } = fakeApi()
    post.mockResolvedValue({ data: { membership: 'member', isFollowing: true }, error: null })
    const gateway = new EdenCommunityGateway(api, new UnauthorizedBus())

    await expect(gateway.join(1)).resolves.toEqual({ membership: 'member', isFollowing: true })
    expect(communities).toHaveBeenCalledWith({ id: 1 })
  })

  it('leave DELETEs /communities/:id/join', async () => {
    const { api, del } = fakeApi()
    del.mockResolvedValue({ data: { membership: 'none', isFollowing: false }, error: null })
    const gateway = new EdenCommunityGateway(api, new UnauthorizedBus())

    await expect(gateway.leave(1)).resolves.toEqual({ membership: 'none', isFollowing: false })
  })

  it('follow POSTs /communities/:id/follow', async () => {
    const { api, post } = fakeApi()
    post.mockResolvedValue({ data: { isFollowing: true }, error: null })
    const gateway = new EdenCommunityGateway(api, new UnauthorizedBus())

    await expect(gateway.follow(1)).resolves.toEqual({ isFollowing: true })
  })

  it('unfollow DELETEs /communities/:id/follow', async () => {
    const { api, del } = fakeApi()
    del.mockResolvedValue({ data: { isFollowing: false }, error: null })
    const gateway = new EdenCommunityGateway(api, new UnauthorizedBus())

    await expect(gateway.unfollow(1)).resolves.toEqual({ isFollowing: false })
  })

  it('emits on the bus on a 401', async () => {
    const { api } = fakeApi()
    const bus = new UnauthorizedBus()
    const onUnauthorized = vi.fn()
    bus.on(onUnauthorized)
    const gateway = new EdenCommunityGateway(api, bus)

    await expect(gateway.get('itclub')).rejects.toThrow()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})

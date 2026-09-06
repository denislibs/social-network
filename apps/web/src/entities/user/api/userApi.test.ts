import { describe, expect, it, vi } from 'vitest'
import { type ApiClient, UnauthorizedBus } from '@/shared/api'
import { EdenUserGateway } from './userApi'

function fakeApi(): {
  api: ApiClient
  get: ReturnType<typeof vi.fn>
  patch: ReturnType<typeof vi.fn>
  users: ReturnType<typeof vi.fn>
  handles: ReturnType<typeof vi.fn>
} {
  const get = vi.fn().mockResolvedValue({ data: null, error: { status: 401, value: {} } })
  const patch = vi.fn().mockResolvedValue({ data: null, error: { status: 401, value: {} } })
  const users = vi.fn((_p: { id: string | number }) => ({
    get,
    friends: { get },
    followers: { get },
  }))
  const handles = vi.fn((_p: { handle: string }) => ({ get }))
  const api = {
    api: {
      v1: {
        users,
        handles,
        me: { friends: { requests: { get } }, profile: { patch } },
        search: { get },
      },
    },
  } as unknown as ApiClient
  return { api, get, patch, users, handles }
}

describe('EdenUserGateway', () => {
  it('getProfile calls GET /users/:id with the handle and returns the profile', async () => {
    const { api, get, users } = fakeApi()
    get.mockResolvedValue({ data: { user: { id: 5, firstName: 'Den' } }, error: null })
    const gateway = new EdenUserGateway(api, new UnauthorizedBus())

    await expect(gateway.getProfile('den')).resolves.toEqual({ id: 5, firstName: 'Den' })
    expect(users).toHaveBeenCalledWith({ id: 'den' })
    expect(get).toHaveBeenCalled()
  })

  it('getFriends passes the cursor only when non-null', async () => {
    const { api, get, users } = fakeApi()
    get.mockResolvedValue({ data: { items: [], nextCursor: null }, error: null })
    const gateway = new EdenUserGateway(api, new UnauthorizedBus())

    await gateway.getFriends(5, null)
    expect(users).toHaveBeenCalledWith({ id: 5 })
    expect(get).toHaveBeenCalledWith({ query: {} })

    await gateway.getFriends(5, 'abc')
    expect(get).toHaveBeenCalledWith({ query: { cursor: 'abc' } })
  })

  it('getFollowers hits /users/:id/followers', async () => {
    const { api, get, users } = fakeApi()
    get.mockResolvedValue({ data: { items: [], nextCursor: null }, error: null })
    const gateway = new EdenUserGateway(api, new UnauthorizedBus())

    await gateway.getFollowers(7, 'xyz')
    expect(users).toHaveBeenCalledWith({ id: 7 })
    expect(get).toHaveBeenCalledWith({ query: { cursor: 'xyz' } })
  })

  it('getRequests passes dir and an optional cursor', async () => {
    const { api, get } = fakeApi()
    get.mockResolvedValue({ data: { items: [], nextCursor: null }, error: null })
    const gateway = new EdenUserGateway(api, new UnauthorizedBus())

    await gateway.getRequests('incoming', null)
    expect(get).toHaveBeenCalledWith({ query: { dir: 'incoming' } })

    await gateway.getRequests('outgoing', 'c1')
    expect(get).toHaveBeenCalledWith({ query: { dir: 'outgoing', cursor: 'c1' } })
  })

  it('getCounters resolves the profile by numeric id and returns its counters', async () => {
    const { api, get, users } = fakeApi()
    get.mockResolvedValue({
      data: { user: { id: 5, counters: { friends: 3, followers: 1 } } },
      error: null,
    })
    const gateway = new EdenUserGateway(api, new UnauthorizedBus())

    await expect(gateway.getCounters(5)).resolves.toEqual({ friends: 3, followers: 1 })
    expect(users).toHaveBeenCalledWith({ id: '5' })
  })

  it('searchUsers hits /search?kind=users and returns the users array', async () => {
    const { api, get } = fakeApi()
    get.mockResolvedValue({ data: { users: [{ id: 1 }], communities: [] }, error: null })
    const gateway = new EdenUserGateway(api, new UnauthorizedBus())

    await expect(gateway.searchUsers('den')).resolves.toEqual([{ id: 1 }])
    expect(get).toHaveBeenCalledWith({ query: { q: 'den', kind: 'users' } })
  })

  it('updateProfile PATCHes /me/profile and returns the updated profile', async () => {
    const { api, patch } = fakeApi()
    patch.mockResolvedValue({ data: { user: { id: 5, status: 'hi' } }, error: null })
    const gateway = new EdenUserGateway(api, new UnauthorizedBus())

    await expect(gateway.updateProfile({ status: 'hi' })).resolves.toEqual({ id: 5, status: 'hi' })
    expect(patch).toHaveBeenCalledWith({ status: 'hi' })
  })

  it('resolve hits /handles/:handle', async () => {
    const { api, get, handles } = fakeApi()
    get.mockResolvedValue({ data: { kind: 'user', id: 5 }, error: null })
    const gateway = new EdenUserGateway(api, new UnauthorizedBus())

    await expect(gateway.resolve('den')).resolves.toEqual({ kind: 'user', id: 5 })
    expect(handles).toHaveBeenCalledWith({ handle: 'den' })
  })

  it('emits on the bus on a 401', async () => {
    const { api } = fakeApi()
    const bus = new UnauthorizedBus()
    const onUnauthorized = vi.fn()
    bus.on(onUnauthorized)
    const gateway = new EdenUserGateway(api, bus)

    await expect(gateway.getProfile('den')).rejects.toThrow()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})

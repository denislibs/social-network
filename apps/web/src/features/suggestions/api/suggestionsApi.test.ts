import { describe, expect, it, vi } from 'vitest'
import { type ApiClient, UnauthorizedBus } from '@/shared/api'
import { EdenSuggestionsGateway } from './suggestionsApi'

function fakeApi(): {
  api: ApiClient
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  suggestions: ReturnType<typeof vi.fn>
} {
  const get = vi.fn().mockResolvedValue({ data: null, error: { status: 401, value: {} } })
  const post = vi.fn().mockResolvedValue({ data: null, error: { status: 401, value: {} } })
  const suggestions = Object.assign(
    vi.fn((_p: { id: number }) => ({ hide: { post } })),
    { get },
  )
  const api = { api: { v1: { me: { friends: { suggestions } } } } } as unknown as ApiClient
  return { api, get, post, suggestions }
}

describe('EdenSuggestionsGateway', () => {
  it('list calls GET /me/friends/suggestions and returns the items', async () => {
    const { api, get } = fakeApi()
    get.mockResolvedValue({ data: { items: [{ id: 1, mutual: 2 }] }, error: null })
    const gateway = new EdenSuggestionsGateway(api, new UnauthorizedBus())

    await expect(gateway.list()).resolves.toEqual([{ id: 1, mutual: 2 }])
  })

  it('hide POSTs /me/friends/suggestions/:id/hide', async () => {
    const { api, post, suggestions } = fakeApi()
    post.mockResolvedValue({ data: null, error: null })
    const gateway = new EdenSuggestionsGateway(api, new UnauthorizedBus())

    await gateway.hide(5)
    expect(suggestions).toHaveBeenCalledWith({ id: 5 })
  })

  it('emits on the bus on a 401', async () => {
    const { api } = fakeApi()
    const bus = new UnauthorizedBus()
    const onUnauthorized = vi.fn()
    bus.on(onUnauthorized)
    const gateway = new EdenSuggestionsGateway(api, bus)

    await expect(gateway.list()).rejects.toThrow()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})

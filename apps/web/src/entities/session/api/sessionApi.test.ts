import { describe, expect, it, vi } from 'vitest'
import { type ApiClient, ApiError, UnauthorizedBus } from '@/shared/api'
import { EdenSessionGateway } from './sessionApi'

function fakeApi(
  overrides: { me?: ReturnType<typeof vi.fn>; logout?: ReturnType<typeof vi.fn> } = {},
): {
  api: ApiClient
  me: ReturnType<typeof vi.fn>
  logout: ReturnType<typeof vi.fn>
} {
  const me = overrides.me ?? vi.fn()
  const logout = overrides.logout ?? vi.fn()
  const api = {
    api: { v1: { me: { get: me }, auth: { logout: { post: logout } } } },
  } as unknown as ApiClient
  return { api, me, logout }
}

describe('EdenSessionGateway', () => {
  it('returns null on 401 without emitting on the bus', async () => {
    const { api } = fakeApi({
      me: vi.fn().mockResolvedValue({ data: null, error: { status: 401, value: {} } }),
    })
    const bus = new UnauthorizedBus()
    const emitSpy = vi.spyOn(bus, 'emit')
    const gateway = new EdenSessionGateway(api, bus)
    await expect(gateway.me()).resolves.toBeNull()
    expect(emitSpy).not.toHaveBeenCalled()
  })

  it('rethrows a 500 as ApiError', async () => {
    const { api } = fakeApi({
      me: vi.fn().mockResolvedValue({ data: null, error: { status: 500, value: {} } }),
    })
    const bus = new UnauthorizedBus()
    const gateway = new EdenSessionGateway(api, bus)
    await expect(gateway.me()).rejects.toBeInstanceOf(ApiError)
  })
})

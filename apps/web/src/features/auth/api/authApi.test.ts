import { describe, expect, it, vi } from 'vitest'
import { type ApiClient, ApiError, UnauthorizedBus } from '@/shared/api'
import { EdenAuthGateway } from './authApi'

function fakeApi(
  overrides: { login?: ReturnType<typeof vi.fn>; register?: ReturnType<typeof vi.fn> } = {},
): {
  api: ApiClient
  login: ReturnType<typeof vi.fn>
  register: ReturnType<typeof vi.fn>
} {
  const login = overrides.login ?? vi.fn()
  const register = overrides.register ?? vi.fn()
  const api = {
    api: { v1: { auth: { login: { post: login }, register: { post: register } } } },
  } as unknown as ApiClient
  return { api, login, register }
}

const credentials = { login: 'demo', password: 'secret' }
const registration = { login: 'demo', password: 'secret', firstName: 'Д', lastName: 'П' }

describe('EdenAuthGateway', () => {
  describe('login', () => {
    it('returns the user on success', async () => {
      const user = {
        id: 1,
        login: 'demo',
        firstName: 'Д',
        lastName: 'П',
        screenName: null,
        createdAt: '',
      }
      const { api } = fakeApi({ login: vi.fn().mockResolvedValue({ data: { user }, error: null }) })
      const bus = new UnauthorizedBus()
      const gateway = new EdenAuthGateway(api, bus)
      await expect(gateway.login(credentials)).resolves.toEqual(user)
    })

    it('throws ApiError on a 401 without emitting on the bus', async () => {
      const { api } = fakeApi({
        login: vi.fn().mockResolvedValue({ data: null, error: { status: 401, value: {} } }),
      })
      const bus = new UnauthorizedBus()
      const emitSpy = vi.spyOn(bus, 'emit')
      const gateway = new EdenAuthGateway(api, bus)
      await expect(gateway.login(credentials)).rejects.toBeInstanceOf(ApiError)
      expect(emitSpy).not.toHaveBeenCalled()
    })

    it('surfaces a 409 login_taken as ApiError with that code', async () => {
      const { api } = fakeApi({
        login: vi.fn().mockResolvedValue({
          data: null,
          error: { status: 409, value: { error: { code: 'login_taken', message: 'Taken' } } },
        }),
      })
      const bus = new UnauthorizedBus()
      const gateway = new EdenAuthGateway(api, bus)
      await expect(gateway.login(credentials)).rejects.toMatchObject({
        status: 409,
        code: 'login_taken',
      })
    })
  })

  describe('register', () => {
    it('returns the user on success', async () => {
      const user = {
        id: 1,
        login: 'demo',
        firstName: 'Д',
        lastName: 'П',
        screenName: null,
        createdAt: '',
      }
      const { api } = fakeApi({
        register: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      })
      const bus = new UnauthorizedBus()
      const gateway = new EdenAuthGateway(api, bus)
      await expect(gateway.register(registration)).resolves.toEqual(user)
    })

    it('throws ApiError and DOES emit on the bus on a 401', async () => {
      const { api } = fakeApi({
        register: vi.fn().mockResolvedValue({ data: null, error: { status: 401, value: {} } }),
      })
      const bus = new UnauthorizedBus()
      const emitSpy = vi.spyOn(bus, 'emit')
      const gateway = new EdenAuthGateway(api, bus)
      await expect(gateway.register(registration)).rejects.toBeInstanceOf(ApiError)
      expect(emitSpy).toHaveBeenCalledTimes(1)
    })

    it('surfaces a 409 login_taken as ApiError with that code', async () => {
      const { api } = fakeApi({
        register: vi.fn().mockResolvedValue({
          data: null,
          error: { status: 409, value: { error: { code: 'login_taken', message: 'Taken' } } },
        }),
      })
      const bus = new UnauthorizedBus()
      const gateway = new EdenAuthGateway(api, bus)
      await expect(gateway.register(registration)).rejects.toMatchObject({
        status: 409,
        code: 'login_taken',
      })
    })
  })
})

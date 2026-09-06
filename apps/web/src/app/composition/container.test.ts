import { describe, expect, it, vi } from 'vitest'
import { SESSION_GATEWAY } from '@/entities/session'
import { AUTH_GATEWAY } from '@/features/auth'
import { API_CLIENT, type ApiClient, UNAUTHORIZED_BUS } from '@/shared/api'
import type { ServiceIdentifier } from '@/shared/di'
import { COLOR_SCHEME_STORE } from '@/shared/lib'
import { createAppContainer } from './container'

describe('createAppContainer', () => {
  it('resolves every application service and keeps singletons', () => {
    const c = createAppContainer()
    // Checked one identifier at a time (rather than looped over a mixed-type array) so each
    // call infers its own T — a heterogeneous array collapses the branded ServiceIdentifier<T>
    // union and breaks generic inference on `c.get`, see apps/web tsconfig strict mode.
    const check = <T>(t: ServiceIdentifier<T>) => {
      expect(c.get(t)).toBeDefined()
      expect(c.get(t)).toBe(c.get(t))
    }
    check(API_CLIENT)
    check(UNAUTHORIZED_BUS)
    check(AUTH_GATEWAY)
    check(SESSION_GATEWAY)
    check(COLOR_SCHEME_STORE)
  })

  it('shares one UnauthorizedBus instance between gateways and the session controller', async () => {
    const c = createAppContainer()
    const fakeApi = {
      api: {
        v1: {
          auth: {
            register: {
              post: vi
                .fn()
                .mockResolvedValue({ data: null, error: { status: 401, value: undefined } }),
            },
          },
        },
      },
    } as unknown as ApiClient
    c.unbind(API_CLIENT)
    c.bind(API_CLIENT).toConstantValue(fakeApi)

    const onUnauthorized = vi.fn()
    c.get(UNAUTHORIZED_BUS).on(onUnauthorized)

    await expect(
      c.get(AUTH_GATEWAY).register({
        login: 'demo',
        password: 'demo1234',
        firstName: 'Demo',
        lastName: 'User',
      }),
    ).rejects.toThrow()

    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})

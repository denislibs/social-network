import { vi } from 'vitest'
import { createTestContainer } from '@/shared/di'
import { AUTH_GATEWAY, type AuthGateway } from './ports'

/** Slice-internal test helper: import relatively from tests inside `features/auth`. */
export function fakeAuthGateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return { login: vi.fn(), register: vi.fn(), ...overrides }
}

export function authTestContainer(gateway: AuthGateway) {
  const c = createTestContainer()
  c.bind(AUTH_GATEWAY).toConstantValue(gateway)
  return c
}

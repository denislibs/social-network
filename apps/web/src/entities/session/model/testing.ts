import { vi } from 'vitest'
import { UNAUTHORIZED_BUS, UnauthorizedBus } from '@/shared/api'
import { createTestContainer } from '@/shared/di'
import { SESSION_GATEWAY, type SessionGateway } from './ports'

/** Slice-internal test helper: import relatively from tests inside `entities/session`. */
export function fakeSessionGateway(overrides: Partial<SessionGateway> = {}): SessionGateway {
  return { me: vi.fn(), logout: vi.fn(), ...overrides }
}

export function sessionTestContainer(
  gateway: SessionGateway,
  bus: UnauthorizedBus = new UnauthorizedBus(),
) {
  const c = createTestContainer()
  c.bind(SESSION_GATEWAY).toConstantValue(gateway)
  c.bind(UNAUTHORIZED_BUS).toConstantValue(bus)
  return c
}

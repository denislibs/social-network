import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { UNAUTHORIZED_BUS, UnauthorizedBus } from '@/shared/api'
import { createTestContainer } from '@/shared/di'
import { SESSION_GATEWAY, type SessionGateway } from './ports'
import { type Session, SessionContext } from './SessionProvider'

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

/**
 * `useSession` has no DI seam by design (it reads a plain React context), so
 * tests outside this slice can't bind a fake through a container. This wrapper
 * is the sanctioned `vi.mock`-free substitute: it provides `SessionContext`
 * directly with the given (partial) value. Re-exported from the slice's
 * public API as `createSessionTestProvider`.
 */
export function sessionTestWrapper(session: Partial<Session> = {}) {
  const value: Session = {
    user: null,
    status: 'guest',
    setUser: () => {},
    logout: async () => {},
    ...session,
  }
  return function SessionTestWrapper({ children }: { children: ReactNode }) {
    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  }
}

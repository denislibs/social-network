import { vi } from 'vitest'
import { createTestContainer } from '@/shared/di'
import { FRIENDSHIP_GATEWAY, type FriendshipGateway } from './ports'

/** Slice-internal test helper: import relatively from tests inside `features/friendship`. */
export function fakeFriendshipGateway(
  overrides: Partial<FriendshipGateway> = {},
): FriendshipGateway {
  return {
    request: vi.fn(),
    accept: vi.fn(),
    decline: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  }
}

export function friendshipTestContainer(gateway: FriendshipGateway) {
  const c = createTestContainer()
  c.bind(FRIENDSHIP_GATEWAY).toConstantValue(gateway)
  return c
}

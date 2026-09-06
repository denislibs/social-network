import { vi } from 'vitest'
import { COMMUNITY_GATEWAY, type CommunityGateway } from '@/entities/community'
import { USER_GATEWAY, type UserGateway } from '@/entities/user'
import { createTestContainer } from '@/shared/di'

/** Slice-internal test helpers: import relatively from tests inside `features/search`. */
export function fakeUserGateway(overrides: Partial<UserGateway> = {}): UserGateway {
  return {
    getProfile: vi.fn(),
    getFriends: vi.fn(),
    getFollowers: vi.fn(),
    getRequests: vi.fn(),
    getMyCounters: vi.fn(),
    searchUsers: vi.fn().mockResolvedValue([]),
    updateProfile: vi.fn(),
    resolve: vi.fn(),
    ...overrides,
  }
}

export function fakeCommunityGateway(overrides: Partial<CommunityGateway> = {}): CommunityGateway {
  return {
    get: vi.fn(),
    members: vi.fn(),
    mine: vi.fn(),
    search: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    follow: vi.fn(),
    unfollow: vi.fn(),
    ...overrides,
  }
}

export function searchTestContainer(userGateway: UserGateway, communityGateway: CommunityGateway) {
  const c = createTestContainer()
  c.bind(USER_GATEWAY).toConstantValue(userGateway)
  c.bind(COMMUNITY_GATEWAY).toConstantValue(communityGateway)
  return c
}

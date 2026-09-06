import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CommunityDto, CommunityGateway } from '@/entities/community'
import { COMMUNITY_GATEWAY } from '@/entities/community'
import type { HandleDto, ProfileDto, UserGateway } from '@/entities/user'
import { USER_GATEWAY } from '@/entities/user'
import { FRIENDSHIP_GATEWAY, type FriendshipGateway } from '@/features/friendship'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { HandleRoute } from './HandleRoute'

function makeProfile(): ProfileDto {
  return {
    id: 5,
    login: 'den',
    firstName: 'Ден',
    lastName: 'Иванов',
    screenName: null,
    createdAt: '2020-01-01T00:00:00.000Z',
    status: null,
    bio: null,
    city: null,
    birthday: null,
    isVerified: false,
    counters: { friends: 0, followers: 0, communities: 0, incomingRequests: 0 },
    relation: 'self',
  }
}

function makeCommunity(): CommunityDto {
  return {
    id: 9,
    screenName: 'games',
    name: 'Игровой клуб',
    description: null,
    topic: 'games',
    isVerified: false,
    membersCount: 3,
    membership: 'none',
    isFollowing: false,
  }
}

function fakeUserGateway(overrides: Partial<UserGateway> = {}): UserGateway {
  return {
    getProfile: vi.fn(),
    getFriends: vi.fn(),
    getFollowers: vi.fn(),
    getRequests: vi.fn(),
    getMyCounters: vi.fn(),
    searchUsers: vi.fn(),
    updateProfile: vi.fn(),
    resolve: vi.fn(),
    ...overrides,
  }
}

function fakeCommunityGateway(overrides: Partial<CommunityGateway> = {}): CommunityGateway {
  return {
    get: vi.fn(),
    members: vi.fn(),
    mine: vi.fn(),
    search: vi.fn(),
    create: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    follow: vi.fn(),
    unfollow: vi.fn(),
    ...overrides,
  }
}

function fakeFriendshipGateway(overrides: Partial<FriendshipGateway> = {}): FriendshipGateway {
  return { request: vi.fn(), accept: vi.fn(), decline: vi.fn(), remove: vi.fn(), ...overrides }
}

function mount(
  handle: string,
  resolve: (h: string) => Promise<HandleDto>,
  gatewayOverrides: { user?: Partial<UserGateway>; community?: Partial<CommunityGateway> } = {},
) {
  const container = createTestContainer()
  container
    .bind(USER_GATEWAY)
    .toConstantValue(
      fakeUserGateway({ resolve: vi.fn(resolve), getProfile: vi.fn(), ...gatewayOverrides.user }),
    )
  container
    .bind(COMMUNITY_GATEWAY)
    .toConstantValue(fakeCommunityGateway(gatewayOverrides.community))
  container.bind(FRIENDSHIP_GATEWAY).toConstantValue(fakeFriendshipGateway())
  const router = createMemoryRouter([{ path: '/:handle', element: <HandleRoute /> }], {
    initialEntries: [`/${handle}`],
  })
  return render(<RouterProvider router={router} />, { wrapper: withProviders(container) })
}

describe('HandleRoute', () => {
  it('renders the profile page when the handle resolves to a user', async () => {
    mount('id5', () => Promise.resolve({ kind: 'user', id: 5 }), {
      user: { getProfile: vi.fn().mockResolvedValue(makeProfile()) },
    })
    expect(await screen.findByText('Ден Иванов')).toBeInTheDocument()
    expect(screen.getByText('Стена скоро')).toBeInTheDocument()
  })

  it('renders the community page when the handle resolves to a community', async () => {
    mount('games', () => Promise.resolve({ kind: 'community', id: 9 }), {
      community: {
        get: vi.fn().mockResolvedValue(makeCommunity()),
        members: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      },
    })
    expect(await screen.findByText('Игровой клуб')).toBeInTheDocument()
  })

  it('shows a 404 placeholder when the handle does not resolve', async () => {
    mount('nope', () => Promise.reject(new Error('not_found')))
    expect(await screen.findByText('Страница не найдена')).toBeInTheDocument()
  })

  describe('while the handle is resolving', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows a profile-card skeleton instead of a blank frame', async () => {
      let resolveHandle!: (dto: HandleDto) => void
      const pending = new Promise<HandleDto>((resolve) => {
        resolveHandle = resolve
      })
      mount('id5', () => pending, {
        user: { getProfile: vi.fn().mockResolvedValue(makeProfile()) },
      })

      act(() => {
        vi.advanceTimersByTime(200)
      })
      expect(screen.getByLabelText('Загрузка')).toBeInTheDocument()

      resolveHandle({ kind: 'user', id: 5 })
      vi.useRealTimers()
      expect(await screen.findByText('Ден Иванов')).toBeInTheDocument()
    })
  })
})

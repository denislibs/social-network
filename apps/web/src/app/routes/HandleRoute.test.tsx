import { act, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CommunityDto, CommunityGateway } from '@/entities/community'
import { COMMUNITY_GATEWAY } from '@/entities/community'
import { fakeNotificationGateway, NOTIFICATION_GATEWAY } from '@/entities/notification'
import { createSessionTestProvider } from '@/entities/session'
import type { HandleDto, ProfileDto, UserGateway } from '@/entities/user'
import { USER_GATEWAY } from '@/entities/user'
import { FRIENDSHIP_GATEWAY, type FriendshipGateway } from '@/features/friendship'
import { SUGGESTIONS_GATEWAY, type SuggestionsGateway } from '@/features/suggestions'
import { createTestContainer } from '@/shared/di'
import {
  COLOR_SCHEME_STORE,
  ColorSchemeStore,
  fakeSystemScheme,
  fakeTabCoordinator,
  memPrefStorage,
  TAB_COORDINATOR,
  withProviders,
} from '@/shared/lib'
import { HandleRoute } from './HandleRoute'

/** Nests the DI/query wrapper and the session context wrapper into one RTL `wrapper`. */
function compose(
  Outer: (props: { children: ReactNode }) => ReactNode,
  Inner: (props: { children: ReactNode }) => ReactNode,
) {
  return function Composed({ children }: { children: ReactNode }) {
    return (
      <Outer>
        <Inner>{children}</Inner>
      </Outer>
    )
  }
}

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
    getFriends: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    getFollowers: vi.fn(),
    getRequests: vi.fn(),
    getMyCounters: vi
      .fn()
      .mockResolvedValue({ friends: 0, followers: 0, communities: 0, incomingRequests: 0 }),
    searchUsers: vi.fn(),
    updateProfile: vi.fn(),
    resolve: vi.fn(),
    ...overrides,
  }
}

function fakeCommunityGateway(overrides: Partial<CommunityGateway> = {}): CommunityGateway {
  return {
    get: vi.fn(),
    members: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    mine: vi.fn().mockResolvedValue([]),
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

function fakeSuggestionsGateway(overrides: Partial<SuggestionsGateway> = {}): SuggestionsGateway {
  return { list: vi.fn().mockResolvedValue([]), hide: vi.fn(), ...overrides }
}

function RedirectProbe() {
  const location = useLocation()
  const redirect = (location.state as { redirect?: string } | null)?.redirect
  return <div>login:{redirect ?? 'none'}</div>
}

function mount(
  handle: string,
  resolve: (h: string) => Promise<HandleDto>,
  gatewayOverrides: { user?: Partial<UserGateway>; community?: Partial<CommunityGateway> } = {},
  sessionStatus: 'loading' | 'guest' | 'authed' = 'authed',
) {
  const container = createTestContainer()
  container
    .bind(COLOR_SCHEME_STORE)
    .toConstantValue(new ColorSchemeStore(memPrefStorage(null), fakeSystemScheme(false).system))
  const resolveSpy = vi.fn(resolve)
  container
    .bind(USER_GATEWAY)
    .toConstantValue(fakeUserGateway({ resolve: resolveSpy, ...gatewayOverrides.user }))
  container
    .bind(COMMUNITY_GATEWAY)
    .toConstantValue(fakeCommunityGateway(gatewayOverrides.community))
  container.bind(FRIENDSHIP_GATEWAY).toConstantValue(fakeFriendshipGateway())
  container.bind(SUGGESTIONS_GATEWAY).toConstantValue(fakeSuggestionsGateway())
  container.bind(NOTIFICATION_GATEWAY).toConstantValue(fakeNotificationGateway())
  container.bind(TAB_COORDINATOR).toConstantValue(fakeTabCoordinator())
  const Session = createSessionTestProvider(
    sessionStatus === 'authed'
      ? {
          user: {
            id: 5,
            login: 'den',
            firstName: 'Ден',
            lastName: 'Иванов',
            screenName: null,
            createdAt: '',
          },
          status: 'authed',
          setUser: vi.fn(),
          logout: vi.fn(),
        }
      : { status: sessionStatus, setUser: vi.fn(), logout: vi.fn() },
  )
  const router = createMemoryRouter(
    [
      { path: '/:handle', element: <HandleRoute /> },
      { path: '/login', element: <RedirectProbe /> },
    ],
    { initialEntries: [`/${handle}`] },
  )
  const result = render(<RouterProvider router={router} />, {
    wrapper: compose(withProviders(container), Session),
  })
  return { ...result, resolveSpy }
}

describe('HandleRoute', () => {
  it('renders the profile header, wall and right column when the handle is a user', async () => {
    mount('id5', () => Promise.resolve({ kind: 'user', id: 5 }), {
      user: { getProfile: vi.fn().mockResolvedValue(makeProfile()) },
    })
    expect(await screen.findByText('Ден Иванов')).toBeInTheDocument()
    expect(screen.getByText('Записей пока нет')).toBeInTheDocument()
    expect(await screen.findByText('Друзья 0')).toBeInTheDocument()
  })

  it('puts the profile header in the shell wide slot, above both columns', async () => {
    mount('id5', () => Promise.resolve({ kind: 'user', id: 5 }), {
      user: { getProfile: vi.fn().mockResolvedValue(makeProfile()) },
    })
    const name = await screen.findByText('Ден Иванов')
    expect(screen.getByRole('main').contains(name)).toBe(false)
    expect(screen.getByLabelText('Дополнительно').contains(name)).toBe(false)
  })

  it('renders the community page when the handle resolves to a community', async () => {
    mount('games', () => Promise.resolve({ kind: 'community', id: 9 }), {
      community: {
        get: vi.fn().mockResolvedValue(makeCommunity()),
        members: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      },
    })
    expect(await screen.findByText('Игровой клуб')).toBeInTheDocument()
    expect(await screen.findByText('Записей пока нет')).toBeInTheDocument()
    expect(await screen.findByText('Участники 3')).toBeInTheDocument()
  })

  it('puts the community header in the shell wide slot, above both columns', async () => {
    mount('games', () => Promise.resolve({ kind: 'community', id: 9 }), {
      community: {
        get: vi.fn().mockResolvedValue(makeCommunity()),
        members: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      },
    })
    const name = await screen.findByText('Игровой клуб')
    expect(screen.getByRole('main').contains(name)).toBe(false)
    expect(screen.getByLabelText('Дополнительно').contains(name)).toBe(false)
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

    it('shows a profile-header skeleton instead of a blank frame', async () => {
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

  describe('auth guard', () => {
    it('renders the shell frame with a skeleton (not a bare spinner) while the session is loading, without resolving the handle', () => {
      const { resolveSpy } = mount(
        'id5',
        () => Promise.resolve({ kind: 'user', id: 5 }),
        {},
        'loading',
      )

      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByLabelText('Загрузка')).toBeInTheDocument()
      expect(resolveSpy).not.toHaveBeenCalled()
    })

    it('redirects a guest to /login with the attempted path as state, without resolving the handle', async () => {
      const { resolveSpy } = mount(
        'id5',
        () => Promise.resolve({ kind: 'user', id: 5 }),
        {},
        'guest',
      )

      expect(await screen.findByText('login:/id5')).toBeInTheDocument()
      expect(resolveSpy).not.toHaveBeenCalled()
    })
  })
})

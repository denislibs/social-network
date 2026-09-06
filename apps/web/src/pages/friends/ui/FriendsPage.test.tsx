import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { createSessionTestProvider } from '@/entities/session'
import type { UserGateway } from '@/entities/user'
import { USER_GATEWAY } from '@/entities/user'
import { FRIENDSHIP_GATEWAY, type FriendshipGateway } from '@/features/friendship'
import { SUGGESTIONS_GATEWAY, type SuggestionsGateway } from '@/features/suggestions'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { FriendsPage } from './FriendsPage'

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

function fakeUserGateway(overrides: Partial<UserGateway> = {}): UserGateway {
  return {
    getProfile: vi.fn(),
    getFriends: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    getFollowers: vi.fn(),
    getRequests: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    getMyCounters: vi.fn(),
    searchUsers: vi.fn(),
    updateProfile: vi.fn(),
    resolve: vi.fn(),
    ...overrides,
  }
}

function fakeFriendshipGateway(overrides: Partial<FriendshipGateway> = {}): FriendshipGateway {
  return { request: vi.fn(), accept: vi.fn(), decline: vi.fn(), remove: vi.fn(), ...overrides }
}

function fakeSuggestionsGateway(overrides: Partial<SuggestionsGateway> = {}): SuggestionsGateway {
  return { list: vi.fn().mockResolvedValue([]), hide: vi.fn(), ...overrides }
}

function mount(initialPath: string, userOverrides: Partial<UserGateway> = {}) {
  const container = createTestContainer()
  container.bind(USER_GATEWAY).toConstantValue(fakeUserGateway(userOverrides))
  container.bind(FRIENDSHIP_GATEWAY).toConstantValue(fakeFriendshipGateway())
  container.bind(SUGGESTIONS_GATEWAY).toConstantValue(fakeSuggestionsGateway())
  const Session = createSessionTestProvider({
    user: { id: 1, login: 'demo', firstName: 'Д', lastName: 'П', screenName: null, createdAt: '' },
    status: 'authed',
  })
  const router = createMemoryRouter([{ path: '/friends', element: <FriendsPage /> }], {
    initialEntries: [initialPath],
  })
  return render(<RouterProvider router={router} />, {
    wrapper: compose(withProviders(container), Session),
  })
}

describe('FriendsPage', () => {
  it('defaults to the "Все" tab and shows the friends list', () => {
    mount('/friends')
    expect(screen.getByRole('tab', { name: 'Все', selected: true })).toBeInTheDocument()
  })

  it('shows the requests tab from ?tab=requests', async () => {
    mount('/friends?tab=requests')
    expect(screen.getByRole('tab', { name: 'Заявки', selected: true })).toBeInTheDocument()
    expect(await screen.findByRole('tab', { name: 'Входящие' })).toBeInTheDocument()
  })

  it('shows the suggestions tab from ?tab=suggestions', async () => {
    mount('/friends?tab=suggestions')
    expect(screen.getByRole('tab', { name: 'Рекомендации', selected: true })).toBeInTheDocument()
    expect(await screen.findByText('Возможно, вы знакомы')).toBeInTheDocument()
  })

  it('counts incoming requests on the «Заявки» tab', async () => {
    mount('/friends', {
      getMyCounters: vi
        .fn()
        .mockResolvedValue({ friends: 4, followers: 0, communities: 0, incomingRequests: 3 }),
    })

    expect(await screen.findByRole('tab', { name: /Заявки\s*3/ })).toBeInTheDocument()
  })

  it('shows no counter when there are no incoming requests', async () => {
    mount('/friends', {
      getMyCounters: vi
        .fn()
        .mockResolvedValue({ friends: 4, followers: 0, communities: 0, incomingRequests: 0 }),
    })

    expect(await screen.findByRole('tab', { name: 'Заявки' })).toBeInTheDocument()
  })
})

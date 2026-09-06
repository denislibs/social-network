import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { NOTIFICATION_GATEWAY, type NotificationGateway } from '@/entities/notification'
import { createSessionTestProvider } from '@/entities/session'
import type { Counters, UserGateway } from '@/entities/user'
import { USER_GATEWAY } from '@/entities/user'
import { createTestContainer } from '@/shared/di'
import {
  COLOR_SCHEME_STORE,
  ColorSchemeStore,
  fakeSystemScheme,
  memPrefStorage,
  TAB_COORDINATOR,
  type TabCoordinator,
  withProviders,
} from '@/shared/lib'
import { AppShell } from './AppShell'

/** Nests two RTL wrapper components (DI + query client, session context) into one. */
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
    getFriends: vi.fn(),
    getFollowers: vi.fn(),
    getRequests: vi.fn(),
    getMyCounters: vi.fn().mockResolvedValue({
      friends: 0,
      followers: 0,
      communities: 0,
      incomingRequests: 0,
    } satisfies Counters),
    searchUsers: vi.fn(),
    updateProfile: vi.fn(),
    resolve: vi.fn(),
    ...overrides,
  }
}

function fakeNotificationGateway(
  overrides: Partial<NotificationGateway> = {},
): NotificationGateway {
  return {
    unreadCount: vi.fn().mockResolvedValue(0),
    list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    markRead: vi.fn().mockResolvedValue(0),
    ...overrides,
  }
}

function fakeTabCoordinator(overrides: Partial<TabCoordinator> = {}): TabCoordinator {
  return {
    tabId: 'tab-0',
    isLeader: () => true,
    onLeaderChange: () => () => {},
    isActive: () => true,
    onActiveChange: () => () => {},
    broadcast: () => {},
    subscribe: () => () => {},
    ...overrides,
  }
}

function mount(
  path: string,
  bare = false,
  options: { rightColumn?: ReactNode; incomingRequests?: number } = {},
) {
  const { rightColumn, incomingRequests = 0 } = options
  const container = createTestContainer()
  container
    .bind(COLOR_SCHEME_STORE)
    .toConstantValue(new ColorSchemeStore(memPrefStorage(null), fakeSystemScheme(false).system))
  container.bind(USER_GATEWAY).toConstantValue(
    fakeUserGateway({
      getMyCounters: vi
        .fn()
        .mockResolvedValue({ friends: 0, followers: 0, communities: 0, incomingRequests }),
    }),
  )
  container.bind(NOTIFICATION_GATEWAY).toConstantValue(fakeNotificationGateway())
  container.bind(TAB_COORDINATOR).toConstantValue(fakeTabCoordinator())
  const Session = createSessionTestProvider({
    user: {
      id: 1,
      login: 'demo',
      firstName: 'Демо',
      lastName: 'П',
      screenName: null,
      createdAt: '',
    },
    status: 'authed',
    setUser: vi.fn(),
    logout: vi.fn(),
  })
  const router = createMemoryRouter(
    [
      {
        element: <AppShell bare={bare} rightColumn={rightColumn} />,
        children: [
          { path: '/feed', element: <div>FEED</div> },
          { path: '/im', element: <div>IM</div> },
          { path: '/login', element: <div>LOGIN</div> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  return render(<RouterProvider router={router} />, {
    wrapper: compose(withProviders(container), Session),
  })
}

describe('AppShell', () => {
  it('renders seven nav items and marks the current one', () => {
    mount('/feed')
    const nav = screen.getByRole('navigation', { name: 'Основная навигация' })
    expect(nav.querySelectorAll('a')).toHaveLength(7)
    expect(screen.getByRole('link', { name: /Лента/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /Мессенджер/ })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('main')).toHaveTextContent('FEED')
  })

  it('bare mode hides navigation but keeps main', () => {
    mount('/login', true)
    expect(screen.queryByRole('navigation', { name: 'Основная навигация' })).toBeNull()
    expect(screen.getByRole('main')).toHaveTextContent('LOGIN')
  })

  it('header shows logout for an authed user', () => {
    mount('/feed')
    expect(screen.getByRole('button', { name: 'Выйти' })).toBeInTheDocument()
  })

  it('shows the profile nav item linking to the signed-in user handle', () => {
    mount('/feed')
    expect(screen.getByRole('link', { name: /Профиль/ })).toHaveAttribute('href', '/id1')
  })

  it('renders the injected rightColumn content inside the "Дополнительно" aside', () => {
    mount('/feed', false, { rightColumn: <div>PYMK</div> })
    const aside = screen.getByLabelText('Дополнительно')
    expect(aside).toHaveTextContent('PYMK')
  })

  it('renders no aside in bare mode, even with a rightColumn', () => {
    mount('/login', true, { rightColumn: <div>PYMK</div> })
    expect(screen.queryByLabelText('Дополнительно')).not.toBeInTheDocument()
  })

  it('shows a friend-request counter with an accessible label when there are incoming requests', async () => {
    mount('/feed', false, { incomingRequests: 3 })
    expect(await screen.findByLabelText('3 заявки')).toBeInTheDocument()
  })

  it('shows no counter when there are no incoming requests', () => {
    mount('/feed')
    expect(screen.queryByLabelText(/заявк/)).not.toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { CommunityGateway } from '@/entities/community'
import { COMMUNITY_GATEWAY } from '@/entities/community'
import type { UserGateway } from '@/entities/user'
import { USER_GATEWAY } from '@/entities/user'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { SearchPage } from './SearchPage'

function fakeUserGateway(overrides: Partial<UserGateway> = {}): UserGateway {
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

function fakeCommunityGateway(overrides: Partial<CommunityGateway> = {}): CommunityGateway {
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

function mount(initialPath: string, overrides: Partial<UserGateway> = {}) {
  const container = createTestContainer()
  container.bind(USER_GATEWAY).toConstantValue(fakeUserGateway(overrides))
  container.bind(COMMUNITY_GATEWAY).toConstantValue(fakeCommunityGateway())
  const router = createMemoryRouter([{ path: '/search', element: <SearchPage /> }], {
    initialEntries: [initialPath],
  })
  return render(<RouterProvider router={router} />, { wrapper: withProviders(container) })
}

describe('SearchPage', () => {
  it('defaults to the "Все" tab', () => {
    mount('/search?q=денис')
    expect(screen.getByRole('tab', { name: 'Все', selected: true })).toBeInTheDocument()
  })

  it('shows the hint for a short query', () => {
    mount('/search?q=д')
    expect(screen.getByText('Введите минимум 2 символа')).toBeInTheDocument()
  })

  it('switching to "Люди" fetches only users', async () => {
    const searchUsers = vi.fn().mockResolvedValue([])
    mount('/search?q=денис', { searchUsers })
    await userEvent.click(screen.getByRole('tab', { name: 'Люди' }))
    expect(screen.getByRole('tab', { name: 'Люди', selected: true })).toBeInTheDocument()
  })
})

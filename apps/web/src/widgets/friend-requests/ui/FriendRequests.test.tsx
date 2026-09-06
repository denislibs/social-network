import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { UserCellDto, UserGateway } from '@/entities/user'
import { USER_GATEWAY } from '@/entities/user'
import { FRIENDSHIP_GATEWAY, type FriendshipGateway } from '@/features/friendship'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { FriendRequests } from './FriendRequests'

function user(id: number, name: string): UserCellDto {
  return {
    id,
    firstName: name,
    lastName: 'Тестов',
    screenName: null,
    city: null,
    isVerified: false,
    lastSeenAt: null,
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

function fakeFriendshipGateway(overrides: Partial<FriendshipGateway> = {}): FriendshipGateway {
  return { request: vi.fn(), accept: vi.fn(), decline: vi.fn(), remove: vi.fn(), ...overrides }
}

function mount(getRequests: UserGateway['getRequests']) {
  const container = createTestContainer()
  container.bind(USER_GATEWAY).toConstantValue(fakeUserGateway({ getRequests }))
  container.bind(FRIENDSHIP_GATEWAY).toConstantValue(fakeFriendshipGateway())
  render(
    <MemoryRouter>
      <FriendRequests />
    </MemoryRouter>,
    { wrapper: withProviders(container) },
  )
}

describe('FriendRequests', () => {
  it('shows incoming requests by default with a FriendButton per row', async () => {
    const getRequests = vi.fn().mockResolvedValue({ items: [user(1, 'Аня')], nextCursor: null })
    mount(getRequests)

    expect(await screen.findByText('Аня Тестов')).toBeInTheDocument()
    expect(getRequests).toHaveBeenCalledWith('incoming', null)
    expect(screen.getByRole('button', { name: 'Принять' })).toBeInTheDocument()
  })

  it('switches to outgoing requests on tab click', async () => {
    const getRequests = vi.fn().mockImplementation((dir: 'incoming' | 'outgoing') =>
      Promise.resolve({
        items: [user(dir === 'incoming' ? 1 : 2, dir === 'incoming' ? 'Аня' : 'Боря')],
        nextCursor: null,
      }),
    )
    mount(getRequests)

    expect(await screen.findByText('Аня Тестов')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Исходящие' }))

    expect(await screen.findByText('Боря Тестов')).toBeInTheDocument()
    expect(getRequests).toHaveBeenLastCalledWith('outgoing', null)
  })

  it('shows an empty placeholder when there are no requests', async () => {
    mount(vi.fn().mockResolvedValue({ items: [], nextCursor: null }))
    expect(await screen.findByText('Нет входящих заявок')).toBeInTheDocument()
  })
})

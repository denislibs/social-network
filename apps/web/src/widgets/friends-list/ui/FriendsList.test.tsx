import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { Page, UserCellDto, UserGateway } from '@/entities/user'
import { USER_GATEWAY } from '@/entities/user'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { FriendsList } from './FriendsList'

function user(id: number): UserCellDto {
  return {
    id,
    firstName: `Друг${id}`,
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

function mount(getFriends: UserGateway['getFriends']) {
  const gateway = fakeUserGateway({ getFriends })
  const container = createTestContainer()
  container.bind(USER_GATEWAY).toConstantValue(gateway)
  render(
    <MemoryRouter>
      <FriendsList userId={1} />
    </MemoryRouter>,
    { wrapper: withProviders(container) },
  )
  return { gateway }
}

describe('FriendsList', () => {
  it('shows a skeleton with aria-busy while pending', async () => {
    mount(vi.fn((): Promise<never> => new Promise(() => {})))
    expect(await screen.findByLabelText('Загрузка')).toHaveAttribute('aria-busy', 'true')
  })

  it('renders an empty placeholder when there are no friends', async () => {
    mount(vi.fn().mockResolvedValue({ items: [], nextCursor: null } satisfies Page<UserCellDto>))
    expect(await screen.findByText('Пока нет друзей')).toBeInTheDocument()
  })

  it('shows "Показать ещё" when there is a next page, and loads it on click', async () => {
    const getFriends = vi
      .fn()
      .mockResolvedValueOnce({ items: [user(1)], nextCursor: 'c2' })
      .mockResolvedValueOnce({ items: [user(2)], nextCursor: null })
    mount(getFriends)

    expect(await screen.findByText('Друг1 Тестов')).toBeInTheDocument()
    const more = screen.getByRole('button', { name: 'Показать ещё' })
    await userEvent.click(more)

    await waitFor(() => expect(screen.getByText('Друг2 Тестов')).toBeInTheDocument())
    expect(getFriends).toHaveBeenLastCalledWith(1, 'c2')
    expect(screen.queryByRole('button', { name: 'Показать ещё' })).not.toBeInTheDocument()
  })

  it('does not show "Показать ещё" when there is no next page', async () => {
    mount(vi.fn().mockResolvedValue({ items: [user(1)], nextCursor: null }))
    expect(await screen.findByText('Друг1 Тестов')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Показать ещё' })).not.toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { ProfileDto } from '@/entities/user'
import { USER_GATEWAY, type UserGateway } from '@/entities/user'
import { FRIENDSHIP_GATEWAY, type FriendshipGateway } from '@/features/friendship'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { ProfileCard } from './ProfileCard'

function makeProfile(overrides: Partial<ProfileDto> = {}): ProfileDto {
  return {
    id: 5,
    login: 'den',
    firstName: 'Ден',
    lastName: 'Иванов',
    screenName: null,
    createdAt: '2020-03-01T00:00:00.000Z',
    status: 'Всё хорошо',
    bio: null,
    city: 'Москва',
    birthday: null,
    isVerified: false,
    counters: { friends: 12, followers: 34, communities: 5, incomingRequests: 0 },
    relation: 'none',
    ...overrides,
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

function mount(profile: ProfileDto, handle = 'id5') {
  const gateway = fakeUserGateway({ getProfile: vi.fn().mockResolvedValue(profile) })
  const container = createTestContainer()
  container.bind(USER_GATEWAY).toConstantValue(gateway)
  container.bind(FRIENDSHIP_GATEWAY).toConstantValue(fakeFriendshipGateway())

  render(
    <MemoryRouter>
      <ProfileCard handle={handle} />
    </MemoryRouter>,
    { wrapper: withProviders(container) },
  )
  return { gateway }
}

describe('ProfileCard', () => {
  it('shows a skeleton with aria-busy while pending', async () => {
    const gateway = fakeUserGateway({
      getProfile: vi.fn((): Promise<never> => new Promise(() => {})),
    })
    const container = createTestContainer()
    container.bind(USER_GATEWAY).toConstantValue(gateway)
    container.bind(FRIENDSHIP_GATEWAY).toConstantValue(fakeFriendshipGateway())
    render(
      <MemoryRouter>
        <ProfileCard handle="id5" />
      </MemoryRouter>,
      { wrapper: withProviders(container) },
    )
    expect(await screen.findByLabelText('Загрузка')).toHaveAttribute('aria-busy', 'true')
  })

  it('renders name, status and the "member since" line once loaded', async () => {
    mount(makeProfile())
    expect(await screen.findByText('Ден Иванов')).toBeInTheDocument()
    expect(screen.getByText('Всё хорошо')).toBeInTheDocument()
    expect(screen.getByText('Москва · на сайте с 2020')).toBeInTheDocument()
  })

  it('does not render the counters — they live in the right column now', async () => {
    mount(makeProfile())
    await screen.findByText('Ден Иванов')
    expect(screen.queryByText('Друзья 12')).not.toBeInTheDocument()
    expect(screen.queryByText('Подписчики 34')).not.toBeInTheDocument()
    expect(screen.queryByText('Сообщества 5')).not.toBeInTheDocument()
  })

  it('invites the signed-in user to fill in an empty status', async () => {
    mount(makeProfile({ relation: 'self', status: null }))
    expect(await screen.findByRole('link', { name: /Укажите информацию о себе/ })).toHaveAttribute(
      'href',
      '/edit',
    )
  })

  it('shows "Редактировать профиль" instead of a friend button for the signed-in user', async () => {
    mount(makeProfile({ relation: 'self' }))
    expect(await screen.findByRole('link', { name: 'Редактировать профиль' })).toHaveAttribute(
      'href',
      '/edit',
    )
    expect(screen.queryByRole('button', { name: 'Добавить в друзья' })).not.toBeInTheDocument()
  })

  it('shows a FriendButton for another user', async () => {
    mount(makeProfile({ relation: 'none' }))
    expect(await screen.findByRole('button', { name: 'Добавить в друзья' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Редактировать профиль' })).not.toBeInTheDocument()
  })
})

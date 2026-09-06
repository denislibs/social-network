import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { ProfileDto, UserGateway } from '@/entities/user'
import { USER_GATEWAY } from '@/entities/user'
import { FRIENDSHIP_GATEWAY, type FriendshipGateway } from '@/features/friendship'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { ProfilePage } from './ProfilePage'

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

describe('ProfilePage', () => {
  it('renders the profile card and a wall placeholder', async () => {
    const container = createTestContainer()
    container
      .bind(USER_GATEWAY)
      .toConstantValue(fakeUserGateway({ getProfile: vi.fn().mockResolvedValue(makeProfile()) }))
    container.bind(FRIENDSHIP_GATEWAY).toConstantValue(fakeFriendshipGateway())
    render(
      <MemoryRouter>
        <ProfilePage handle="id5" />
      </MemoryRouter>,
      { wrapper: withProviders(container) },
    )
    expect(await screen.findByText('Ден Иванов')).toBeInTheDocument()
    expect(screen.getByText('Стена скоро')).toBeInTheDocument()
  })
})

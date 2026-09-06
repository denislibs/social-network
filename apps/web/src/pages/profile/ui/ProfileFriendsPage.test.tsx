import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { ProfileDto, UserGateway } from '@/entities/user'
import { USER_GATEWAY } from '@/entities/user'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { ProfileFriendsPage } from './ProfileFriendsPage'

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

describe('ProfileFriendsPage', () => {
  it('resolves the handle then renders that user’s friends list', async () => {
    const container = createTestContainer()
    container.bind(USER_GATEWAY).toConstantValue(
      fakeUserGateway({
        getProfile: vi.fn().mockResolvedValue(makeProfile()),
        getFriends: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      }),
    )
    render(
      <MemoryRouter>
        <ProfileFriendsPage handle="id5" />
      </MemoryRouter>,
      { wrapper: withProviders(container) },
    )
    expect(await screen.findByText('Пока нет друзей')).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { CommunityCellDto, CommunityGateway } from '@/entities/community'
import { COMMUNITY_GATEWAY } from '@/entities/community'
import type { ProfileDto, UserCellDto, UserGateway } from '@/entities/user'
import { USER_GATEWAY } from '@/entities/user'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { ProfileAside } from './ProfileAside'

function makeProfile(overrides: Partial<ProfileDto> = {}): ProfileDto {
  return {
    id: 5,
    login: 'den',
    firstName: 'Ден',
    lastName: 'Иванов',
    screenName: null,
    createdAt: '2020-03-01T00:00:00.000Z',
    status: null,
    bio: null,
    city: null,
    birthday: null,
    isVerified: false,
    counters: { friends: 12, followers: 34, communities: 5, incomingRequests: 0 },
    relation: 'none',
    ...overrides,
  }
}

function friend(id: number, firstName: string): UserCellDto {
  return {
    id,
    firstName,
    lastName: 'Тестов',
    screenName: null,
    city: null,
    isVerified: false,
    lastSeenAt: null,
  }
}

function community(id: number, name: string): CommunityCellDto {
  return { id, screenName: `c${id}`, name, topic: 'games', isVerified: false, membersCount: 10 }
}

function fakeUserGateway(overrides: Partial<UserGateway> = {}): UserGateway {
  return {
    getProfile: vi.fn(),
    getFriends: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
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

function mount(
  profile: ProfileDto,
  options: { friends?: UserCellDto[]; communities?: CommunityCellDto[]; handle?: string } = {},
) {
  const { friends = [], communities = [], handle = 'id5' } = options
  const container = createTestContainer()
  container.bind(USER_GATEWAY).toConstantValue(
    fakeUserGateway({
      getProfile: vi.fn().mockResolvedValue(profile),
      getFriends: vi.fn().mockResolvedValue({ items: friends, nextCursor: null }),
    }),
  )
  container
    .bind(COMMUNITY_GATEWAY)
    .toConstantValue(fakeCommunityGateway({ mine: vi.fn().mockResolvedValue(communities) }))
  render(
    <MemoryRouter>
      <ProfileAside handle={handle} />
    </MemoryRouter>,
    { wrapper: withProviders(container) },
  )
}

describe('ProfileAside', () => {
  it('shows the friends and communities counter cards from the profile', async () => {
    mount(makeProfile())
    expect(await screen.findByText('Друзья 12')).toBeInTheDocument()
    expect(screen.getByText('Сообщества 5')).toBeInTheDocument()
  })

  it('does not render a followers card — the count lives in the profile header footnote', async () => {
    mount(makeProfile())
    await screen.findByText('Друзья 12')
    expect(screen.queryByText(/Подписчики/)).not.toBeInTheDocument()
  })

  it('renders a preview grid of at most six friends with an "Все" link', async () => {
    const friends = [1, 2, 3, 4, 5, 6, 7].map((id) => friend(id, `Друг${id}`))
    mount(makeProfile(), { friends })
    expect(await screen.findByText('Друг1')).toBeInTheDocument()
    expect(screen.getByText('Друг6')).toBeInTheDocument()
    expect(screen.queryByText('Друг7')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Все друзья' })).toHaveAttribute('href', '/id5/friends')
  })

  it('links "Все" to /friends on the signed-in user own profile', async () => {
    mount(makeProfile({ relation: 'self' }), { friends: [friend(1, 'Друг1')] })
    expect(await screen.findByRole('link', { name: 'Все друзья' })).toHaveAttribute(
      'href',
      '/friends',
    )
  })

  it('offers to find friends when the signed-in user has none', async () => {
    mount(
      makeProfile({
        relation: 'self',
        counters: { friends: 0, followers: 0, communities: 0, incomingRequests: 0 },
      }),
    )
    expect(await screen.findByText('У вас пока нет друзей')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Добавить друзей' })).toHaveAttribute(
      'href',
      '/friends?tab=suggestions',
    )
  })

  it('lists the signed-in user communities under the counter', async () => {
    mount(makeProfile({ relation: 'self' }), { communities: [community(9, 'Игровой клуб')] })
    expect(await screen.findByText('Игровой клуб')).toBeInTheDocument()
  })

  it('shows only the community count for another user', async () => {
    const mine = vi.fn().mockResolvedValue([community(9, 'Игровой клуб')])
    const container = createTestContainer()
    container
      .bind(USER_GATEWAY)
      .toConstantValue(fakeUserGateway({ getProfile: vi.fn().mockResolvedValue(makeProfile()) }))
    container.bind(COMMUNITY_GATEWAY).toConstantValue(fakeCommunityGateway({ mine }))
    render(
      <MemoryRouter>
        <ProfileAside handle="id5" />
      </MemoryRouter>,
      { wrapper: withProviders(container) },
    )
    expect(await screen.findByText('Сообщества 5')).toBeInTheDocument()
    expect(mine).not.toHaveBeenCalled()
  })
})

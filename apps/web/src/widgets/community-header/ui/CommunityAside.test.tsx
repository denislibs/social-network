import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { CommunityDto, CommunityGateway } from '@/entities/community'
import { COMMUNITY_GATEWAY } from '@/entities/community'
import type { UserCellDto } from '@/entities/user'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { CommunityAside } from './CommunityAside'

function makeCommunity(overrides: Partial<CommunityDto> = {}): CommunityDto {
  return {
    id: 9,
    screenName: 'games',
    name: 'Игровой клуб',
    description: null,
    topic: 'games',
    isVerified: false,
    membersCount: 120,
    membership: 'none',
    isFollowing: false,
    ...overrides,
  }
}

function member(id: number, firstName: string): UserCellDto {
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

function fakeCommunityGateway(overrides: Partial<CommunityGateway> = {}): CommunityGateway {
  return {
    get: vi.fn(),
    members: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    mine: vi.fn(),
    search: vi.fn(),
    create: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    follow: vi.fn(),
    unfollow: vi.fn(),
    ...overrides,
  }
}

function mount(community: CommunityDto, members: UserCellDto[] = []) {
  const container = createTestContainer()
  container.bind(COMMUNITY_GATEWAY).toConstantValue(
    fakeCommunityGateway({
      get: vi.fn().mockResolvedValue(community),
      members: vi.fn().mockResolvedValue({ items: members, nextCursor: null }),
    }),
  )
  render(
    <MemoryRouter>
      <CommunityAside handle="games" />
    </MemoryRouter>,
    { wrapper: withProviders(container) },
  )
}

describe('CommunityAside', () => {
  it('shows the members counter card from the community', async () => {
    mount(makeCommunity())
    expect(await screen.findByText('Участники 120')).toBeInTheDocument()
  })

  it('renders a preview grid of at most six members with an "Все участники" link', async () => {
    const members = [1, 2, 3, 4, 5, 6, 7].map((id) => member(id, `Участник${id}`))
    mount(makeCommunity(), members)
    expect(await screen.findByText('Участник1')).toBeInTheDocument()
    expect(screen.getByText('Участник6')).toBeInTheDocument()
    expect(screen.queryByText('Участник7')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Все участники' })).toHaveAttribute(
      'href',
      '/games/members',
    )
  })

  it('shows a placeholder when there are no members yet', async () => {
    mount(makeCommunity({ membersCount: 0 }))
    expect(await screen.findByText('Пока нет участников')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Все участники' })).not.toBeInTheDocument()
  })
})

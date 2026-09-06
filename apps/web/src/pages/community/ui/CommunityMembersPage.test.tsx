import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { CommunityDto, CommunityGateway } from '@/entities/community'
import { COMMUNITY_GATEWAY } from '@/entities/community'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { CommunityMembersPage } from './CommunityMembersPage'

function makeCommunity(): CommunityDto {
  return {
    id: 9,
    screenName: 'games',
    name: 'Игровой клуб',
    description: null,
    topic: 'games',
    isVerified: false,
    membersCount: 0,
    membership: 'none',
    isFollowing: false,
  }
}

function fakeCommunityGateway(overrides: Partial<CommunityGateway> = {}): CommunityGateway {
  return {
    get: vi.fn(),
    members: vi.fn(),
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

describe('CommunityMembersPage', () => {
  it('resolves the handle then renders that community’s member list', async () => {
    const container = createTestContainer()
    container.bind(COMMUNITY_GATEWAY).toConstantValue(
      fakeCommunityGateway({
        get: vi.fn().mockResolvedValue(makeCommunity()),
        members: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      }),
    )
    render(
      <MemoryRouter>
        <CommunityMembersPage handle="games" />
      </MemoryRouter>,
      { wrapper: withProviders(container) },
    )
    expect(await screen.findByText('Пока нет участников')).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CommunityDto, CommunityGateway } from '@/entities/community'
import { COMMUNITY_GATEWAY } from '@/entities/community'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { CommunityPage } from './CommunityPage'

function makeCommunity(): CommunityDto {
  return {
    id: 9,
    screenName: 'games',
    name: 'Игровой клуб',
    description: null,
    topic: 'games',
    isVerified: false,
    membersCount: 3,
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

describe('CommunityPage', () => {
  it('renders the header and the members list', async () => {
    const container = createTestContainer()
    container.bind(COMMUNITY_GATEWAY).toConstantValue(
      fakeCommunityGateway({
        get: vi.fn().mockResolvedValue(makeCommunity()),
        members: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      }),
    )
    render(<CommunityPage handle="games" />, { wrapper: withProviders(container) })
    expect(await screen.findByText('Игровой клуб')).toBeInTheDocument()
    expect(await screen.findByText('Пока нет участников')).toBeInTheDocument()
  })
})

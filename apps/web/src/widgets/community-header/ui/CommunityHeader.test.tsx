import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CommunityDto, CommunityGateway } from '@/entities/community'
import { COMMUNITY_GATEWAY } from '@/entities/community'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { CommunityHeader } from './CommunityHeader'

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

function mount(community: CommunityDto) {
  const container = createTestContainer()
  container
    .bind(COMMUNITY_GATEWAY)
    .toConstantValue(fakeCommunityGateway({ get: vi.fn().mockResolvedValue(community) }))
  render(<CommunityHeader handle="games" />, { wrapper: withProviders(container) })
}

describe('CommunityHeader', () => {
  it('shows a skeleton with aria-busy while pending', async () => {
    const container = createTestContainer()
    container
      .bind(COMMUNITY_GATEWAY)
      .toConstantValue(
        fakeCommunityGateway({ get: vi.fn((): Promise<never> => new Promise(() => {})) }),
      )
    render(<CommunityHeader handle="games" />, { wrapper: withProviders(container) })
    expect(await screen.findByLabelText('Загрузка')).toHaveAttribute('aria-busy', 'true')
  })

  it('renders the name, topic and members count', async () => {
    mount(makeCommunity())
    expect(await screen.findByText('Игровой клуб')).toBeInTheDocument()
    expect(screen.getByText('Игры · 120 участников')).toBeInTheDocument()
  })

  it('renders a full-width cover with the avatar overlapping it, like the profile header', async () => {
    mount(makeCommunity())
    expect(await screen.findByTestId('community-cover')).toBeInTheDocument()
    expect(screen.getByTestId('community-avatar')).toBeInTheDocument()
  })

  it('shows an inert "Ещё" button next to the membership actions', async () => {
    mount(makeCommunity())
    expect(await screen.findByRole('button', { name: /Ещё/ })).toBeInTheDocument()
  })

  it('shows "Вступить" when not a member', async () => {
    mount(makeCommunity({ membership: 'none' }))
    expect(await screen.findByRole('button', { name: 'Вступить' })).toBeInTheDocument()
  })

  it('shows "Вы участник" and "Выйти" when already a member', async () => {
    mount(makeCommunity({ membership: 'member' }))
    expect(await screen.findByRole('button', { name: 'Вы участник' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Выйти' })).toBeInTheDocument()
  })
})

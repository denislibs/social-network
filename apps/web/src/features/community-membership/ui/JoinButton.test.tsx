import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { COMMUNITY_GATEWAY, type CommunityDto, type CommunityGateway } from '@/entities/community'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { JoinButton } from './JoinButton'

const community: CommunityDto = {
  id: 10,
  screenName: 'itclub',
  name: 'IT Club',
  description: null,
  topic: 'it',
  isVerified: false,
  membersCount: 5,
  membership: 'none',
  isFollowing: false,
}

function fakeGateway(overrides: Partial<CommunityGateway> = {}): CommunityGateway {
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

function mount(c: CommunityDto, overrides: Partial<CommunityGateway> = {}) {
  const gateway = fakeGateway(overrides)
  const container = createTestContainer()
  container.bind(COMMUNITY_GATEWAY).toConstantValue(gateway)
  render(<JoinButton community={c} />, { wrapper: withProviders(container) })
  return { gateway }
}

describe('JoinButton', () => {
  it('none: shows a single "Вступить" button and joins on click', async () => {
    const { gateway } = mount(community, {
      join: vi.fn().mockResolvedValue({ membership: 'member', isFollowing: true }),
    })
    await userEvent.click(screen.getByRole('button', { name: 'Вступить' }))
    expect(gateway.join).toHaveBeenCalledWith(10)
  })

  it('member: shows "Вы участник" and "Выйти"', () => {
    mount({ ...community, membership: 'member', isFollowing: true })
    expect(screen.getByRole('button', { name: 'Вы участник' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Выйти' })).toBeInTheDocument()
  })
})

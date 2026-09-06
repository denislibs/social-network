import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { COMMUNITY_GATEWAY, type CommunityDto, type CommunityGateway } from '@/entities/community'
import { ApiError } from '@/shared/api'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { FollowButton } from './FollowButton'

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
  render(<FollowButton community={c} />, { wrapper: withProviders(container) })
  return { gateway }
}

describe('FollowButton', () => {
  it('shows "Подписаться" and follows on click', async () => {
    const { gateway } = mount(community, {
      follow: vi.fn().mockResolvedValue({ isFollowing: true }),
    })
    await userEvent.click(screen.getByRole('button', { name: 'Подписаться' }))
    expect(gateway.follow).toHaveBeenCalledWith(10)
  })

  it('shows "Вы подписаны" when already following', () => {
    mount({ ...community, isFollowing: true })
    expect(screen.getByRole('button', { name: 'Вы подписаны' })).toBeInTheDocument()
  })

  it('shows a Snackbar with the fallback error text when following fails', async () => {
    mount(community, {
      follow: vi.fn().mockRejectedValue(new ApiError(500, 'unknown', 'boom')),
    })
    await userEvent.click(screen.getByRole('button', { name: 'Подписаться' }))
    expect(await screen.findByText('Не удалось изменить подписку')).toBeInTheDocument()
  })
})

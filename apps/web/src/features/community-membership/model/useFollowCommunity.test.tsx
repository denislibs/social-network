import { QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { COMMUNITY_GATEWAY, type CommunityDto, type CommunityGateway } from '@/entities/community'
import { createTestContainer } from '@/shared/di'
import { queryKeys, withProviders } from '@/shared/lib'
import { useFollowCommunity } from './useFollowCommunity'

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

function setup(c: CommunityDto, overrides: Partial<CommunityGateway> = {}) {
  const gateway = fakeGateway(overrides)
  const container = createTestContainer()
  container.bind(COMMUNITY_GATEWAY).toConstantValue(gateway)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(queryKeys.community.get('itclub'), c)
  const hook = renderHook(() => useFollowCommunity(c), {
    wrapper: withProviders(container, queryClient),
  })
  return { ...hook, gateway, queryClient }
}

describe('useFollowCommunity', () => {
  it('not following: label is "Подписаться"; clicking follows', async () => {
    const { result, gateway, queryClient } = setup(community, {
      follow: vi.fn().mockResolvedValue({ isFollowing: true }),
    })
    expect(result.current.label).toBe('Подписаться')

    act(() => result.current.onClick())
    await waitFor(() =>
      expect(
        queryClient.getQueryData<CommunityDto>(queryKeys.community.get('itclub'))?.isFollowing,
      ).toBe(true),
    )
    expect(gateway.follow).toHaveBeenCalledWith(10)
  })

  it('following: label is "Вы подписаны"; clicking unfollows', async () => {
    const following = { ...community, isFollowing: true }
    const { result, gateway, queryClient } = setup(following, {
      unfollow: vi.fn().mockResolvedValue({ isFollowing: false }),
    })
    expect(result.current.label).toBe('Вы подписаны')

    act(() => result.current.onClick())
    await waitFor(() =>
      expect(
        queryClient.getQueryData<CommunityDto>(queryKeys.community.get('itclub'))?.isFollowing,
      ).toBe(false),
    )
    expect(gateway.unfollow).toHaveBeenCalledWith(10)
  })
})

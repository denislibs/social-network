import { QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { COMMUNITY_GATEWAY, type CommunityDto, type CommunityGateway } from '@/entities/community'
import { createTestContainer } from '@/shared/di'
import { queryKeys, withProviders } from '@/shared/lib'
import { useJoinCommunity } from './useJoinCommunity'

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
  const hook = renderHook(() => useJoinCommunity(c), {
    wrapper: withProviders(container, queryClient),
  })
  return { ...hook, gateway, queryClient }
}

describe('useJoinCommunity', () => {
  it('none: label is "Вступить"; joining sets membership to member and isFollowing to true', async () => {
    const { result, gateway, queryClient } = setup(community, {
      join: vi.fn().mockResolvedValue({ membership: 'member', isFollowing: true }),
    })
    expect(result.current.label).toBe('Вступить')

    act(() => result.current.onClick())
    await waitFor(() =>
      expect(
        queryClient.getQueryData<CommunityDto>(queryKeys.community.get('itclub')),
      ).toMatchObject({ membership: 'member', isFollowing: true, membersCount: 6 }),
    )
    expect(gateway.join).toHaveBeenCalledWith(10)
  })

  it('joining invalidates the viewer\'s own counters cache (matched by key[0] === "counters", since the hook only knows the community, not "me"\'s id)', async () => {
    const { result, queryClient } = setup(community, {
      join: vi.fn().mockResolvedValue({ membership: 'member', isFollowing: true }),
    })
    queryClient.setQueryData(['counters', 42], { friends: 0, communities: 0 })

    act(() => result.current.onClick())
    await waitFor(() =>
      expect(queryClient.getQueryState(['counters', 42])?.isInvalidated).toBe(true),
    )
  })

  it('joining invalidates the community members lists (full and preview)', async () => {
    const { result, queryClient } = setup(community, {
      join: vi.fn().mockResolvedValue({ membership: 'member', isFollowing: true }),
    })
    queryClient.setQueryData(queryKeys.community.members(community.id), {
      items: [],
      nextCursor: null,
    })
    queryClient.setQueryData(queryKeys.community.membersPreview(community.id), [])

    act(() => result.current.onClick())
    await waitFor(() =>
      expect(
        queryClient.getQueryState(queryKeys.community.members(community.id))?.isInvalidated,
      ).toBe(true),
    )
    expect(
      queryClient.getQueryState(queryKeys.community.membersPreview(community.id))?.isInvalidated,
    ).toBe(true)
  })

  it('member: label is "Вы участник" and leaving resolves to none', async () => {
    const member = { ...community, membership: 'member' as const, isFollowing: true }
    const { result, queryClient } = setup(member, {
      leave: vi.fn().mockResolvedValue({ membership: 'none', isFollowing: false }),
    })
    expect(result.current.label).toBe('Вы участник')
    expect(result.current.secondary?.label).toBe('Выйти')

    act(() => result.current.secondary?.onClick())
    await waitFor(() =>
      expect(
        queryClient.getQueryData<CommunityDto>(queryKeys.community.get('itclub')),
      ).toMatchObject({ membership: 'none', isFollowing: false }),
    )
  })

  it('leaving invalidates the community members lists (full and preview)', async () => {
    const member = { ...community, membership: 'member' as const, isFollowing: true }
    const { result, queryClient } = setup(member, {
      leave: vi.fn().mockResolvedValue({ membership: 'none', isFollowing: false }),
    })
    queryClient.setQueryData(queryKeys.community.members(member.id), {
      items: [],
      nextCursor: null,
    })
    queryClient.setQueryData(queryKeys.community.membersPreview(member.id), [])

    act(() => result.current.secondary?.onClick())
    await waitFor(() =>
      expect(queryClient.getQueryState(queryKeys.community.members(member.id))?.isInvalidated).toBe(
        true,
      ),
    )
    expect(
      queryClient.getQueryState(queryKeys.community.membersPreview(member.id))?.isInvalidated,
    ).toBe(true)
  })

  it('surfaces the last_admin error text and rolls back the optimistic update', async () => {
    const admin = { ...community, membership: 'admin' as const, isFollowing: true }
    const { result, queryClient } = setup(admin, {
      leave: vi.fn().mockRejectedValue({ code: 'last_admin' }),
    })

    act(() => result.current.secondary?.onClick())
    await waitFor(() =>
      expect(result.current.error).toBe('Назначьте другого администратора перед выходом'),
    )
    expect(queryClient.getQueryData<CommunityDto>(queryKeys.community.get('itclub'))).toMatchObject(
      { membership: 'admin' },
    )
  })
})

import { QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { COMMUNITY_GATEWAY, type CommunityDto, type CommunityGateway } from '@/entities/community'
import { createTestContainer } from '@/shared/di'
import { queryKeys, withProviders } from '@/shared/lib'
import { useCommunityMenu } from './useCommunityMenu'

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

function setup(community: CommunityDto, overrides: Partial<CommunityGateway> = {}) {
  const gateway = fakeCommunityGateway(overrides)
  const container = createTestContainer()
  container.bind(COMMUNITY_GATEWAY).toConstantValue(gateway)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(queryKeys.community.get('games'), community)
  const hook = renderHook(() => useCommunityMenu(community), {
    wrapper: withProviders(container, queryClient),
  })
  return { ...hook, gateway, queryClient }
}

const labels = (result: { current: ReturnType<typeof useCommunityMenu> }) =>
  result.current.menuItems.map((i) => i.label)

describe('useCommunityMenu', () => {
  it('non-member: the membership control is «Вступить» and joining calls the gateway', async () => {
    const { result, gateway } = setup(makeCommunity(), {
      join: vi.fn().mockResolvedValue({ membership: 'member', isFollowing: true }),
    })

    expect(result.current.isMember).toBe(false)
    expect(result.current.membershipLabel).toBe('Вступить')
    expect(result.current.followLabel).toBe('Подписаться')

    act(() => result.current.join())
    await waitFor(() => expect(gateway.join).toHaveBeenCalledWith(9))
  })

  it('member: the membership control is «Вы участник»', () => {
    const { result } = setup(makeCommunity({ membership: 'member', isFollowing: true }))
    expect(result.current.isMember).toBe(true)
    expect(result.current.membershipLabel).toBe('Вы участник')
  })

  it('a following member is offered «Отписаться от уведомлений» and leaving', () => {
    const { result } = setup(makeCommunity({ membership: 'member', isFollowing: true }))
    expect(labels(result)).toEqual(['Отписаться от уведомлений', 'Выйти из сообщества'])
  })

  it('a member who is not following is offered «Подписаться на уведомления» instead', () => {
    const { result } = setup(makeCommunity({ membership: 'member', isFollowing: false }))
    expect(labels(result)).toEqual(['Подписаться на уведомления', 'Выйти из сообщества'])
  })

  it('leaving from the menu calls the gateway and closes the menu', async () => {
    const { result, gateway } = setup(makeCommunity({ membership: 'member', isFollowing: true }), {
      leave: vi.fn().mockResolvedValue({ membership: 'none', isFollowing: false }),
    })

    act(() => result.current.setMenuShown(true))
    expect(result.current.menuShown).toBe(true)

    act(() => {
      result.current.menuItems[1]?.onClick()
    })

    expect(result.current.menuShown).toBe(false)
    await waitFor(() => expect(gateway.leave).toHaveBeenCalledWith(9))
  })

  it('the notifications item toggles following and closes the menu', async () => {
    const { result, gateway } = setup(makeCommunity({ membership: 'member', isFollowing: true }), {
      unfollow: vi.fn().mockResolvedValue({ isFollowing: false }),
    })

    act(() => result.current.setMenuShown(true))
    act(() => {
      result.current.menuItems[0]?.onClick()
    })

    expect(result.current.menuShown).toBe(false)
    await waitFor(() => expect(gateway.unfollow).toHaveBeenCalledWith(9))
  })

  it('surfaces a failed action and clears it on dismiss', async () => {
    const { result } = setup(makeCommunity({ membership: 'admin', isFollowing: true }), {
      leave: vi.fn().mockRejectedValue({ code: 'last_admin' }),
    })

    act(() => {
      result.current.menuItems[1]?.onClick()
    })

    await waitFor(() =>
      expect(result.current.error).toBe('Назначьте другого администратора перед выходом'),
    )

    act(() => result.current.dismissError())
    expect(result.current.error).toBeNull()
  })
})

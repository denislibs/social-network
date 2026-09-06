import { QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Relation } from '@/entities/user'
import { queryKeys, withProviders } from '@/shared/lib'
import { fakeFriendshipGateway, friendshipTestContainer } from './testing'
import { useFriendAction } from './useFriendAction'

function setup(relation: Parameters<typeof useFriendAction>[1], overrides = {}) {
  const gateway = fakeFriendshipGateway(overrides)
  const container = friendshipTestContainer(gateway)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const hook = renderHook(() => useFriendAction(1, relation), {
    wrapper: withProviders(container, queryClient),
  })
  return { ...hook, gateway, queryClient }
}

describe('useFriendAction', () => {
  it('none: primary is "Добавить в друзья"; clicking requests and optimistically sets outgoing', async () => {
    let resolveRequest!: (r: Relation) => void
    const { result, gateway, queryClient } = setup('none', {
      request: vi.fn(() => new Promise<Relation>((r) => (resolveRequest = r))),
    })
    expect(result.current.primary?.label).toBe('Добавить в друзья')

    act(() => result.current.primary?.onClick())
    // Optimistic: set before the (still-pending) request resolves.
    await waitFor(() =>
      expect(queryClient.getQueryData(queryKeys.user.relation(1))).toBe('outgoing'),
    )
    expect(gateway.request).toHaveBeenCalledWith(1)
    expect(result.current.busy).toBe(true)

    await act(async () => resolveRequest('outgoing'))
    await waitFor(() => expect(result.current.busy).toBe(false))
    expect(queryClient.getQueryData(queryKeys.user.relation(1))).toBe('outgoing')
  })

  it('incoming: accept resolves to friends, decline resolves to none', async () => {
    const { result, queryClient } = setup('incoming', {
      accept: vi.fn().mockResolvedValue('friends'),
    })
    expect(result.current.primary?.label).toBe('Принять')
    expect(result.current.secondary?.label).toBe('Отклонить')

    act(() => result.current.primary?.onClick())
    await waitFor(() =>
      expect(queryClient.getQueryData(queryKeys.user.relation(1))).toBe('friends'),
    )
  })

  it('incoming: decline resolves to none', async () => {
    const { result, queryClient } = setup('incoming', {
      decline: vi.fn().mockResolvedValue('none'),
    })

    act(() => result.current.secondary?.onClick())
    await waitFor(() => expect(queryClient.getQueryData(queryKeys.user.relation(1))).toBe('none'))
  })

  it('friends: secondary is "Удалить из друзей" and removes down to none', async () => {
    const { result, queryClient } = setup('friends', {
      remove: vi.fn().mockResolvedValue('none'),
    })
    expect(result.current.primary?.label).toBe('У вас в друзьях')
    expect(result.current.primary?.disabled).toBe(true)
    expect(result.current.secondary?.label).toBe('Удалить из друзей')

    act(() => result.current.secondary?.onClick())
    await waitFor(() => expect(queryClient.getQueryData(queryKeys.user.relation(1))).toBe('none'))
  })

  it('outgoing: secondary is "Отменить заявку" and cancels down to none', async () => {
    const { result, queryClient } = setup('outgoing', {
      remove: vi.fn().mockResolvedValue('none'),
    })
    expect(result.current.primary?.label).toBe('Заявка отправлена')
    expect(result.current.primary?.disabled).toBe(true)
    expect(result.current.secondary?.label).toBe('Отменить заявку')

    act(() => result.current.secondary?.onClick())
    await waitFor(() => expect(queryClient.getQueryData(queryKeys.user.relation(1))).toBe('none'))
  })

  it('self: primary is null', () => {
    const { result } = setup('self')
    expect(result.current.primary).toBeNull()
  })

  it('rolls back the cache and surfaces the request_cooldown message on error', async () => {
    const { result, queryClient } = setup('none', {
      request: vi.fn().mockRejectedValue({ code: 'request_cooldown' }),
    })

    act(() => result.current.primary?.onClick())

    await waitFor(() => expect(result.current.error).toBe('Заявку можно повторить через сутки'))
    expect(queryClient.getQueryData(queryKeys.user.relation(1))).toBe('none')
  })

  it('dismissError clears the error', async () => {
    const { result } = setup('none', {
      request: vi.fn().mockRejectedValue({ code: 'request_cooldown' }),
    })
    act(() => result.current.primary?.onClick())
    await waitFor(() => expect(result.current.error).not.toBeNull())

    act(() => result.current.dismissError())
    expect(result.current.error).toBeNull()
  })
})

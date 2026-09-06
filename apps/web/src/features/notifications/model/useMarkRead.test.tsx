import { QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys, withProviders } from '@/shared/lib'
import { fakeNotificationGateway, fakeTabCoordinator, notificationsTestContainer } from './testing'
import { useMarkRead } from './useMarkRead'

function setup() {
  const gateway = fakeNotificationGateway({ markRead: vi.fn().mockResolvedValue(1) })
  const coordinator = fakeTabCoordinator({ broadcast: vi.fn() })
  const container = notificationsTestContainer(gateway, coordinator)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(queryKeys.notifications.unread, 5)
  const hook = renderHook(() => useMarkRead(), { wrapper: withProviders(container, queryClient) })
  return { ...hook, gateway, coordinator, queryClient }
}

describe('useMarkRead', () => {
  it('calls the gateway with uptoId', async () => {
    const { result, gateway } = setup()
    act(() => result.current.markRead(42))
    await waitFor(() => expect(gateway.markRead).toHaveBeenCalledWith(42))
  })

  it('on success: sets the unread cache to the returned count', async () => {
    const { result, queryClient } = setup()
    act(() => result.current.markRead(42))
    await waitFor(() => expect(queryClient.getQueryData(queryKeys.notifications.unread)).toBe(1))
  })

  it('on success: invalidates the notification list', async () => {
    const { result, queryClient } = setup()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    act(() => result.current.markRead(42))
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.notifications.list }),
    )
  })

  it('on success: broadcasts notifications:read with uptoId', async () => {
    const { result, coordinator } = setup()
    act(() => result.current.markRead(42))
    await waitFor(() =>
      expect(coordinator.broadcast).toHaveBeenCalledWith({
        type: 'notifications:read',
        uptoId: 42,
      }),
    )
  })
})

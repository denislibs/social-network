import { focusManager } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { withProviders } from '@/shared/lib'
import { fakeNotificationGateway, fakeTabCoordinator, notificationsTestContainer } from './testing'
import { useUnreadCount } from './useUnreadCount'

describe('useUnreadCount', () => {
  afterEach(() => {
    vi.useRealTimers()
    focusManager.setFocused(undefined)
  })

  it('leader tab: fetches and returns the count', async () => {
    const gateway = fakeNotificationGateway({ unreadCount: async () => 3 })
    const container = notificationsTestContainer(
      gateway,
      fakeTabCoordinator({ isLeader: () => true }),
    )

    const { result } = renderHook(() => useUnreadCount(), { wrapper: withProviders(container) })

    await waitFor(() => expect(result.current.count).toBe(3))
  })

  it('non-leader tab: fetches once on mount but never polls', async () => {
    vi.useFakeTimers()
    const unreadCount = vi.fn().mockResolvedValue(1)
    const container = notificationsTestContainer(
      fakeNotificationGateway({ unreadCount }),
      fakeTabCoordinator({ isLeader: () => false }),
    )

    renderHook(() => useUnreadCount(), { wrapper: withProviders(container) })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(unreadCount).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000)
    })
    expect(unreadCount).toHaveBeenCalledTimes(1)
  })

  it('non-leader tab: refetches once when the window regains focus', async () => {
    const unreadCount = vi.fn().mockResolvedValue(1)
    const container = notificationsTestContainer(
      fakeNotificationGateway({ unreadCount }),
      fakeTabCoordinator({ isLeader: () => false }),
    )

    renderHook(() => useUnreadCount(), { wrapper: withProviders(container) })
    await waitFor(() => expect(unreadCount).toHaveBeenCalledTimes(1))

    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })

    await waitFor(() => expect(unreadCount).toHaveBeenCalledTimes(2))
  })

  it('isPending reflects the query still loading', () => {
    const gateway = fakeNotificationGateway({ unreadCount: () => new Promise(() => {}) })
    const container = notificationsTestContainer(
      gateway,
      fakeTabCoordinator({ isLeader: () => true }),
    )

    const { result } = renderHook(() => useUnreadCount(), { wrapper: withProviders(container) })

    expect(result.current.isPending).toBe(true)
  })
})

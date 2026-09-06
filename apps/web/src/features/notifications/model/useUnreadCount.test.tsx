import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { withProviders } from '@/shared/lib'
import { fakeNotificationGateway, fakeTabCoordinator, notificationsTestContainer } from './testing'
import { useUnreadCount } from './useUnreadCount'

describe('useUnreadCount', () => {
  it('leader tab: fetches and returns the count', async () => {
    const gateway = fakeNotificationGateway({ unreadCount: async () => 3 })
    const container = notificationsTestContainer(
      gateway,
      fakeTabCoordinator({ isLeader: () => true }),
    )

    const { result } = renderHook(() => useUnreadCount(), { wrapper: withProviders(container) })

    await waitFor(() => expect(result.current.count).toBe(3))
  })

  it('non-leader tab: does not call the gateway and starts at 0', async () => {
    const gateway = fakeNotificationGateway()
    const container = notificationsTestContainer(
      gateway,
      fakeTabCoordinator({ isLeader: () => false }),
    )

    const { result } = renderHook(() => useUnreadCount(), { wrapper: withProviders(container) })

    expect(result.current.count).toBe(0)
    expect(gateway.unreadCount).not.toHaveBeenCalled()
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

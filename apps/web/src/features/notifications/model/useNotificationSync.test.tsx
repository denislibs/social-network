import { QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NOTIFICATION_GATEWAY, type NotificationGateway } from '@/entities/notification'
import { createTestContainer } from '@/shared/di'
import {
  fakeTabCluster,
  queryKeys,
  TAB_COORDINATOR,
  type TabCoordinator,
  withProviders,
} from '@/shared/lib'
import { fakeNotificationGateway } from './testing'
import { useMarkRead } from './useMarkRead'
import { useNotificationSync } from './useNotificationSync'

/** Mounts both hooks under test in one tab: `useNotificationSync` for the sync side effects,
 * `useMarkRead` so a test can trigger a mark-read from a given tab. */
function mountTab(tab: TabCoordinator, gateway: NotificationGateway) {
  const container = createTestContainer()
  container.bind(TAB_COORDINATOR).toConstantValue(tab)
  container.bind(NOTIFICATION_GATEWAY).toConstantValue(gateway)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const hook = renderHook(
    () => {
      useNotificationSync()
      return useMarkRead()
    },
    { wrapper: withProviders(container, queryClient) },
  )
  return { ...hook, queryClient }
}

describe('useNotificationSync (fakeTabCluster(3))', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("the leader's count reaches every other tab's cache over the broadcast channel", async () => {
    const cluster = fakeTabCluster(3)
    const unreadCount = vi.fn().mockResolvedValue(2)
    const gateway = fakeNotificationGateway({ unreadCount })

    const tabs = cluster.tabs.map((t) => mountTab(t, gateway))

    await waitFor(() => {
      for (const t of tabs) {
        expect(t.queryClient.getQueryData(queryKeys.notifications.unread)).toBe(2)
      }
    })
  })

  it('a signed-out tab never leads: mounting the sync is what makes a tab eligible', async () => {
    const cluster = fakeTabCluster(2)
    // Tab 0 is a guest — `NotificationSync` is not mounted there, so nothing ever marks it
    // eligible. Model that by withdrawing eligibility before anything mounts.
    cluster.tabs[0]!.setEligible(false)
    const gateway = fakeNotificationGateway({ unreadCount: vi.fn().mockResolvedValue(1) })

    mountTab(cluster.tabs[1]!, gateway)

    await waitFor(() => expect(cluster.tabs[1]!.isLeader()).toBe(true))
    expect(cluster.tabs[0]!.isLeader()).toBe(false)
  })

  it('logging out of the leader tab hands leadership to another tab', async () => {
    const cluster = fakeTabCluster(2)
    const gateway = fakeNotificationGateway({ unreadCount: vi.fn().mockResolvedValue(1) })
    const leaderTab = mountTab(cluster.tabs[0]!, gateway)
    mountTab(cluster.tabs[1]!, gateway)

    expect(cluster.tabs[0]!.isLeader()).toBe(true)

    // Logout unmounts `NotificationSync` (see `app/composition/NotificationSync.tsx`).
    act(() => leaderTab.unmount())

    expect(cluster.tabs[0]!.isLeader()).toBe(false)
    expect(cluster.tabs[1]!.isLeader()).toBe(true)
  })

  it('document.title becomes "(2) ВКлон" in every tab once the count is synced', async () => {
    const cluster = fakeTabCluster(3)
    const gateway = fakeNotificationGateway({ unreadCount: vi.fn().mockResolvedValue(2) })
    cluster.tabs.map((t) => mountTab(t, gateway))

    await waitFor(() => expect(document.title).toBe('(2) ВКлон'))
  })

  it('closing the leader promotes tab 1, which starts polling once the interval elapses', async () => {
    vi.useFakeTimers()
    const cluster = fakeTabCluster(3)
    const unreadCount = vi.fn().mockResolvedValue(2)
    const gateway = fakeNotificationGateway({ unreadCount })
    for (const t of cluster.tabs) mountTab(t, gateway)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    const afterMount = unreadCount.mock.calls.length

    act(() => cluster.close(0))
    expect(cluster.tabs[1]!.isLeader()).toBe(true)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })

    expect(unreadCount.mock.calls.length).toBeGreaterThan(afterMount)
  })

  it('marking read in tab 2 invalidates unread everywhere, and the (still leading) tab 0 refetches', async () => {
    const cluster = fakeTabCluster(3)
    const unreadCount = vi.fn().mockResolvedValue(2)
    const markRead = vi.fn().mockResolvedValue(0)
    const gateway = fakeNotificationGateway({ unreadCount, markRead })
    const tabs = cluster.tabs.map((t) => mountTab(t, gateway))

    await waitFor(() => expect(unreadCount.mock.calls.length).toBeGreaterThan(0))
    const beforeMarkRead = unreadCount.mock.calls.length

    act(() => tabs[2]!.result.current.markRead(99))

    await waitFor(() => expect(markRead).toHaveBeenCalledWith(99))
    await waitFor(() => expect(unreadCount.mock.calls.length).toBeGreaterThan(beforeMarkRead))
  })
})

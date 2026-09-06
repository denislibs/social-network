import { vi } from 'vitest'
import { NOTIFICATION_GATEWAY, type NotificationGateway } from '@/entities/notification'
import { createTestContainer } from '@/shared/di'
import { TAB_COORDINATOR, type TabCoordinator } from '@/shared/lib'

/** Slice-internal test helper: import relatively from tests inside `features/notifications`. */
export function fakeNotificationGateway(
  overrides: Partial<NotificationGateway> = {},
): NotificationGateway {
  return {
    unreadCount: vi.fn().mockResolvedValue(0),
    list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    markRead: vi.fn().mockResolvedValue(0),
    ...overrides,
  }
}

/** A single-tab stand-in `TabCoordinator`: always leader and active, no-op broadcast/subscribe.
 * Multi-tab behaviour (leader election, message fan-out) is exercised with the real
 * `fakeTabCluster` in `useNotificationSync.test.tsx` instead. */
export function fakeTabCoordinator(overrides: Partial<TabCoordinator> = {}): TabCoordinator {
  return {
    tabId: 'tab-0',
    isLeader: () => true,
    onLeaderChange: () => () => {},
    isActive: () => true,
    onActiveChange: () => () => {},
    broadcast: () => {},
    subscribe: () => () => {},
    ...overrides,
  }
}

export function notificationsTestContainer(
  gateway: NotificationGateway,
  coordinator: TabCoordinator = fakeTabCoordinator(),
) {
  const c = createTestContainer()
  c.bind(NOTIFICATION_GATEWAY).toConstantValue(gateway)
  c.bind(TAB_COORDINATOR).toConstantValue(coordinator)
  return c
}

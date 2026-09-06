import { vi } from 'vitest'
import type { NotificationGateway } from './ports'

/** Canonical `NotificationGateway` test double, exported from the slice's public API so every
 * consumer (features, widgets, pages, app composition) shares one fake instead of copy-pasting
 * it per test file. */
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

import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NOTIFICATION_GATEWAY, type NotificationGateway } from '@/entities/notification'
import { createSessionTestProvider } from '@/entities/session'
import { createTestContainer } from '@/shared/di'
import { TAB_COORDINATOR, type TabCoordinator, withProviders } from '@/shared/lib'
import { NotificationSync } from './NotificationSync'

function fakeNotificationGateway(
  overrides: Partial<NotificationGateway> = {},
): NotificationGateway {
  return {
    unreadCount: vi.fn().mockResolvedValue(0),
    list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    markRead: vi.fn().mockResolvedValue(0),
    ...overrides,
  }
}

function fakeTabCoordinator(overrides: Partial<TabCoordinator> = {}): TabCoordinator {
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

function mount(status: 'authed' | 'guest' | 'loading', gateway: NotificationGateway) {
  const container = createTestContainer()
  container.bind(NOTIFICATION_GATEWAY).toConstantValue(gateway)
  container.bind(TAB_COORDINATOR).toConstantValue(fakeTabCoordinator())
  const SessionWrapper = createSessionTestProvider({ status })
  const Providers = withProviders(container)
  return render(
    <SessionWrapper>
      <Providers>
        <NotificationSync />
      </Providers>
    </SessionWrapper>,
  )
}

describe('NotificationSync', () => {
  it('renders nothing, whether authed or not', () => {
    const { container } = mount('authed', fakeNotificationGateway())
    expect(container.innerHTML).toBe('')
  })

  it('while authed: mounts the sync hook, which polls unread count', async () => {
    const unreadCount = vi.fn().mockResolvedValue(0)
    mount('authed', fakeNotificationGateway({ unreadCount }))
    await waitFor(() => expect(unreadCount).toHaveBeenCalled())
  })

  it('while a guest: never polls, since the hook is not mounted at all', async () => {
    const unreadCount = vi.fn().mockResolvedValue(0)
    mount('guest', fakeNotificationGateway({ unreadCount }))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(unreadCount).not.toHaveBeenCalled()
  })
})

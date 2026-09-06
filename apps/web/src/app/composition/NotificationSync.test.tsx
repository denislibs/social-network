import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  fakeNotificationGateway,
  NOTIFICATION_GATEWAY,
  type NotificationGateway,
} from '@/entities/notification'
import { createSessionTestProvider } from '@/entities/session'
import { createTestContainer } from '@/shared/di'
import {
  fakeTabCoordinator,
  TAB_COORDINATOR,
  type TabCoordinator,
  withProviders,
} from '@/shared/lib'
import { NotificationSync } from './NotificationSync'

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

/** Builds a fresh `NotificationSync` element tree keyed on `status`: since
 * `createSessionTestProvider` returns a new component type on every call, passing a rebuilt tree
 * to RTL's `rerender` after a `status` change forces React to unmount the previous subtree
 * (including `NotificationSyncActive`) rather than merely re-render it — the same transition a
 * real logout causes. */
function syncTree(
  status: 'authed' | 'guest',
  gateway: NotificationGateway,
  coordinator: TabCoordinator,
) {
  const container = createTestContainer()
  container.bind(NOTIFICATION_GATEWAY).toConstantValue(gateway)
  container.bind(TAB_COORDINATOR).toConstantValue(coordinator)
  const SessionWrapper = createSessionTestProvider({ status })
  const Providers = withProviders(container)
  return (
    <SessionWrapper>
      <Providers>
        <NotificationSync />
      </Providers>
    </SessionWrapper>
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

  it('resets the tab title on logout instead of leaving a stale unread badge', async () => {
    const gateway = fakeNotificationGateway({ unreadCount: vi.fn().mockResolvedValue(3) })
    const coordinator = fakeTabCoordinator()
    const { rerender } = render(syncTree('authed', gateway, coordinator))
    await waitFor(() => expect(document.title).toBe('(3) ВКлон'))

    rerender(syncTree('guest', gateway, coordinator))
    expect(document.title).toBe('ВКлон')
  })
})

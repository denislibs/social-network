import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type * as Vkui from '@vkontakte/vkui'
import { cloneElement, type ReactElement, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { NotificationDto } from '@/entities/notification'
import { withProviders } from '@/shared/lib'
import { fakeNotificationGateway, notificationsTestContainer } from '../model/testing'
import { NotificationBell } from './NotificationBell'

/**
 * The real `Popover` drives its open state through `floating-ui`'s positioning/focus-trap
 * machinery, which is prohibitively slow under jsdom (getBoundingClientRect always reports a
 * zero-size box, so the settle logic runs far longer than in a real browser) — allowed here
 * per the "vi.mock is fine for third-party libraries with no DI seam (VKUI, react-router)"
 * rule. The stand-in below keeps the exact contract this test cares about (a clickable
 * reference that toggles `content` via `onShownChange`) without any of that machinery.
 */
vi.mock('@vkontakte/vkui', async (importOriginal) => {
  const actual = await importOriginal<typeof Vkui>()
  return {
    ...actual,
    Popover: ({
      children,
      content,
      onShownChange,
    }: {
      children: ReactElement<{ onClick?: () => void }>
      content: ReactNode
      onShownChange?: (shown: boolean) => void
    }) => (
      <>
        {cloneElement(children, { onClick: () => onShownChange?.(true) })}
        {content}
      </>
    ),
  }
})

function notification(id: number): NotificationDto {
  return {
    id,
    kind: 'friend_accepted',
    createdAt: new Date().toISOString(),
    readAt: null,
    actor: {
      id: 9,
      firstName: 'Аня',
      lastName: 'Смирнова',
      screenName: null,
      city: null,
      isVerified: false,
      lastSeenAt: null,
    },
    payload: {},
  }
}

function mount(overrides: Parameters<typeof fakeNotificationGateway>[0] = {}) {
  const gateway = fakeNotificationGateway({
    unreadCount: vi.fn().mockResolvedValue(2),
    list: vi
      .fn()
      .mockResolvedValue({ items: [notification(5), notification(3)], nextCursor: null }),
    ...overrides,
  })
  const container = notificationsTestContainer(gateway)
  render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>,
    { wrapper: withProviders(container) },
  )
  return { gateway }
}

describe('NotificationBell', () => {
  it('shows the unread count as a Counter and in the accessible label', async () => {
    mount()
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument())
    expect(
      screen.getByRole('button', { name: /Уведомления, непрочитанных: 2/ }),
    ).toBeInTheDocument()
  })

  it('no counter and a plain label when there are no unread notifications', async () => {
    mount({ unreadCount: vi.fn().mockResolvedValue(0) })
    expect(await screen.findByRole('button', { name: 'Уведомления' })).toBeInTheDocument()
    expect(screen.queryByText('2')).not.toBeInTheDocument()
  })

  it('clicking opens the notification list and marks read up to the newest item', async () => {
    const markRead = vi.fn().mockResolvedValue(0)
    const { gateway } = mount({ markRead })
    await waitFor(() => expect(gateway.list).toHaveBeenCalled())

    await userEvent.click(screen.getByRole('button', { name: /Уведомления/ }))

    expect(await screen.findByRole('link', { name: 'Все уведомления' })).toBeInTheDocument()
    await waitFor(() => expect(markRead).toHaveBeenCalledWith(5))
  })
})

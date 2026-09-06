import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { NOTIFICATION_GATEWAY, type NotificationGateway } from '@/entities/notification'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { NotificationsPage } from './NotificationsPage'

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

function mount(overrides: Partial<NotificationGateway> = {}) {
  const gateway = fakeNotificationGateway(overrides)
  const container = createTestContainer()
  container.bind(NOTIFICATION_GATEWAY).toConstantValue(gateway)
  render(
    <MemoryRouter>
      <NotificationsPage />
    </MemoryRouter>,
    { wrapper: withProviders(container) },
  )
  return { gateway }
}

describe('NotificationsPage', () => {
  it('shows a header and the empty placeholder with no notifications', async () => {
    mount()
    expect(screen.getByText('Уведомления')).toBeInTheDocument()
    expect(await screen.findByText('Уведомлений пока нет')).toBeInTheDocument()
  })

  it('renders notification rows when there are some', async () => {
    mount({
      list: vi.fn().mockResolvedValue({
        items: [
          {
            id: 1,
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
          },
        ],
        nextCursor: null,
      }),
    })
    expect(await screen.findByText('Аня Смирнова принял(а) вашу заявку')).toBeInTheDocument()
  })
})

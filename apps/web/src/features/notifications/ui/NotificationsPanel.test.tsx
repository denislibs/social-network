import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { NotificationDto } from '@/entities/notification'
import { NotificationsPanel } from './NotificationsPanel'

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

function mount(items: NotificationDto[]) {
  return render(
    <MemoryRouter>
      <NotificationsPanel items={items} />
    </MemoryRouter>,
  )
}

describe('NotificationsPanel', () => {
  it('renders an empty placeholder when there are no items', () => {
    mount([])
    expect(screen.getByText('Уведомлений пока нет')).toBeInTheDocument()
  })

  it('renders one row per item and a link to the full list', () => {
    mount([notification(1), notification(2)])
    expect(screen.getAllByText(/Смирнова/)).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Все уведомления' })).toHaveAttribute(
      'href',
      '/notifications',
    )
  })
})

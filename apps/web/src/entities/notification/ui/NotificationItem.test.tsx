import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { NotificationDto } from '../model/types'
import { NotificationItem } from './NotificationItem'

function makeNotification(overrides: Partial<NotificationDto> = {}): NotificationDto {
  return {
    id: 1,
    kind: 'friend_request',
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
    ...overrides,
  }
}

function mount(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('NotificationItem', () => {
  it('renders the actor name and links to the described href', () => {
    mount(<NotificationItem notification={makeNotification()} />)
    const link = screen.getByRole('link', { name: /Аня Смирнова/ })
    expect(link).toHaveAttribute('href', '/friends?tab=requests')
  })

  it('shows an unread badge when readAt is null', () => {
    mount(<NotificationItem notification={makeNotification({ readAt: null })} />)
    expect(document.querySelector('.vkuiBadge__host')).toBeInTheDocument()
  })

  it('hides the unread badge once read', () => {
    mount(
      <NotificationItem notification={makeNotification({ readAt: new Date().toISOString() })} />,
    )
    expect(document.querySelector('.vkuiBadge__host')).not.toBeInTheDocument()
  })

  it('renders a fallback icon (no avatar) when there is no actor', () => {
    mount(
      <NotificationItem
        notification={makeNotification({
          kind: 'community_post',
          actor: null,
          payload: { postId: 5 },
        })}
      />,
    )
    expect(screen.getByText('новая запись в сообществе')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/post5')
  })
})

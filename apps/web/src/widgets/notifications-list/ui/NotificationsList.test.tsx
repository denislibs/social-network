import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NotificationDto, NotificationGateway } from '@/entities/notification'
import { fakeNotificationGateway, NOTIFICATION_GATEWAY } from '@/entities/notification'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { NotificationsList } from './NotificationsList'

function notification(id: number): NotificationDto {
  return {
    id,
    kind: 'friend_accepted',
    createdAt: new Date().toISOString(),
    readAt: null,
    actor: {
      id: 9,
      firstName: `Друг${id}`,
      lastName: 'Тестов',
      screenName: null,
      city: null,
      isVerified: false,
      lastSeenAt: null,
    },
    payload: {},
  }
}

function mount(list: NotificationGateway['list']) {
  const gateway = fakeNotificationGateway({ list })
  const container = createTestContainer()
  container.bind(NOTIFICATION_GATEWAY).toConstantValue(gateway)
  render(
    <MemoryRouter>
      <NotificationsList />
    </MemoryRouter>,
    { wrapper: withProviders(container) },
  )
  return { gateway }
}

describe('NotificationsList', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a skeleton with aria-busy while pending', async () => {
    mount(vi.fn((): Promise<never> => new Promise(() => {})))
    expect(await screen.findByLabelText('Загрузка')).toHaveAttribute('aria-busy', 'true')
  })

  it('shows neither the skeleton nor the empty placeholder before the 150 ms delay', () => {
    vi.useFakeTimers()
    mount(vi.fn((): Promise<never> => new Promise(() => {})))

    expect(screen.queryByText('Уведомлений пока нет')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Загрузка')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(screen.getByLabelText('Загрузка')).toBeInTheDocument()
    expect(screen.queryByText('Уведомлений пока нет')).not.toBeInTheDocument()
  })

  it('renders an empty placeholder when there are no notifications', async () => {
    mount(vi.fn().mockResolvedValue({ items: [], nextCursor: null }))
    expect(await screen.findByText('Уведомлений пока нет')).toBeInTheDocument()
  })

  it('renders one row per notification', async () => {
    mount(
      vi.fn().mockResolvedValue({ items: [notification(1), notification(2)], nextCursor: null }),
    )
    expect(await screen.findAllByText('Друг1 Тестов принял(а) вашу заявку')).toHaveLength(1)
    expect(screen.getByText('Друг2 Тестов принял(а) вашу заявку')).toBeInTheDocument()
  })

  it('shows "Показать ещё" when there is a next page, and loads it on click', async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({ items: [notification(1)], nextCursor: 'c2' })
      .mockResolvedValueOnce({ items: [notification(2)], nextCursor: null })
    mount(list)

    expect(await screen.findByText('Друг1 Тестов принял(а) вашу заявку')).toBeInTheDocument()
    const more = screen.getByRole('button', { name: 'Показать ещё' })
    await userEvent.click(more)

    await waitFor(() =>
      expect(screen.getByText('Друг2 Тестов принял(а) вашу заявку')).toBeInTheDocument(),
    )
    expect(list).toHaveBeenLastCalledWith('c2')
    expect(screen.queryByRole('button', { name: 'Показать ещё' })).not.toBeInTheDocument()
  })

  it('does not show "Показать ещё" when there is no next page', async () => {
    mount(vi.fn().mockResolvedValue({ items: [notification(1)], nextCursor: null }))
    expect(await screen.findByText('Друг1 Тестов принял(а) вашу заявку')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Показать ещё' })).not.toBeInTheDocument()
  })
})

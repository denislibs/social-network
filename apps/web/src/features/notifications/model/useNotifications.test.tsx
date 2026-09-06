import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { NotificationDto } from '@/entities/notification'
import { type Page, withProviders } from '@/shared/lib'
import { fakeNotificationGateway, notificationsTestContainer } from './testing'
import { useNotifications } from './useNotifications'

function makeNotification(id: number): NotificationDto {
  return {
    id,
    kind: 'friend_request',
    createdAt: new Date().toISOString(),
    readAt: null,
    actor: null,
    payload: {},
  }
}

describe('useNotifications', () => {
  it('starts pending and then returns the first page', async () => {
    const gateway = fakeNotificationGateway({
      list: vi.fn().mockResolvedValue({
        items: [makeNotification(2), makeNotification(1)],
        nextCursor: null,
      } satisfies Page<NotificationDto>),
    })
    const container = notificationsTestContainer(gateway)

    const { result } = renderHook(() => useNotifications(), { wrapper: withProviders(container) })

    await waitFor(() => expect(result.current.items).toHaveLength(2))
    expect(result.current.hasNextPage).toBe(false)
    expect(gateway.list).toHaveBeenCalledWith(null)
  })

  it('fetchNextPage requests the next cursor and appends items', async () => {
    const gateway = fakeNotificationGateway({
      list: vi
        .fn()
        .mockResolvedValueOnce({ items: [makeNotification(2)], nextCursor: 'c2' })
        .mockResolvedValueOnce({ items: [makeNotification(1)], nextCursor: null }),
    })
    const container = notificationsTestContainer(gateway)

    const { result } = renderHook(() => useNotifications(), { wrapper: withProviders(container) })

    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(result.current.hasNextPage).toBe(true)

    result.current.fetchNextPage()

    await waitFor(() => expect(result.current.items).toHaveLength(2))
    expect(gateway.list).toHaveBeenLastCalledWith('c2')
    expect(result.current.hasNextPage).toBe(false)
  })
})

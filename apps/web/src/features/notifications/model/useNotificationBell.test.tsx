import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { NotificationDto } from '@/entities/notification'
import { withProviders } from '@/shared/lib'
import { fakeNotificationGateway, notificationsTestContainer } from './testing'
import { useNotificationBell } from './useNotificationBell'

function notification(id: number): NotificationDto {
  return {
    id,
    kind: 'friend_request',
    createdAt: new Date().toISOString(),
    readAt: null,
    actor: null,
    payload: {},
  }
}

describe('useNotificationBell', () => {
  it('label is plain "Уведомления" at 0 unread', () => {
    const container = notificationsTestContainer(fakeNotificationGateway())
    const { result } = renderHook(() => useNotificationBell(), {
      wrapper: withProviders(container),
    })
    expect(result.current.label).toBe('Уведомления')
  })

  it('label includes the count when unread > 0', async () => {
    const gateway = fakeNotificationGateway({ unreadCount: vi.fn().mockResolvedValue(2) })
    const container = notificationsTestContainer(gateway)
    const { result } = renderHook(() => useNotificationBell(), {
      wrapper: withProviders(container),
    })
    await waitFor(() => expect(result.current.label).toBe('Уведомления, непрочитанных: 2'))
  })

  it('previewItems is capped at 10', async () => {
    const items = Array.from({ length: 15 }, (_, i) => notification(i + 1))
    const gateway = fakeNotificationGateway({
      list: vi.fn().mockResolvedValue({ items, nextCursor: null }),
    })
    const container = notificationsTestContainer(gateway)
    const { result } = renderHook(() => useNotificationBell(), {
      wrapper: withProviders(container),
    })
    await waitFor(() => expect(result.current.previewItems).toHaveLength(10))
  })

  it('onShownChange(true) marks read up to the highest-id item; onShownChange(false) is a no-op', async () => {
    const markRead = vi.fn().mockResolvedValue(0)
    const gateway = fakeNotificationGateway({
      unreadCount: vi.fn().mockResolvedValue(2),
      list: vi
        .fn()
        .mockResolvedValue({ items: [notification(5), notification(3)], nextCursor: null }),
      markRead,
    })
    const container = notificationsTestContainer(gateway)
    const { result } = renderHook(() => useNotificationBell(), {
      wrapper: withProviders(container),
    })
    await waitFor(() => expect(result.current.previewItems).toHaveLength(2))

    result.current.onShownChange(false)
    expect(markRead).not.toHaveBeenCalled()

    result.current.onShownChange(true)
    await waitFor(() => expect(markRead).toHaveBeenCalledWith(5))
  })

  it('onShownChange(true) with no items does not call markRead', () => {
    const markRead = vi.fn()
    const container = notificationsTestContainer(fakeNotificationGateway({ markRead }))
    const { result } = renderHook(() => useNotificationBell(), {
      wrapper: withProviders(container),
    })
    result.current.onShownChange(true)
    expect(markRead).not.toHaveBeenCalled()
  })

  it('onShownChange(true) with an all-read history (unread count 0) does not call markRead, even though items exist', async () => {
    const markRead = vi.fn()
    const gateway = fakeNotificationGateway({
      unreadCount: vi.fn().mockResolvedValue(0),
      list: vi.fn().mockResolvedValue({ items: [notification(5)], nextCursor: null }),
      markRead,
    })
    const container = notificationsTestContainer(gateway)
    const { result } = renderHook(() => useNotificationBell(), {
      wrapper: withProviders(container),
    })
    await waitFor(() => expect(result.current.previewItems).toHaveLength(1))

    result.current.onShownChange(true)
    expect(markRead).not.toHaveBeenCalled()
  })
})

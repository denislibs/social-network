import type { NotificationDto } from '@/entities/notification'
import { useMarkRead } from './useMarkRead'
import { useNotifications } from './useNotifications'
import { useUnreadCount } from './useUnreadCount'

const PREVIEW_SIZE = 10

/** Composes the three notification hooks `NotificationBell` needs into one flat view model:
 * the accessible label, the unread count for the `Counter` overlay, the popover's preview
 * slice, and a shown-change handler that marks everything up to the newest item read the
 * moment the popover opens. */
export function useNotificationBell(): {
  label: string
  count: number
  previewItems: NotificationDto[]
  onShownChange(shown: boolean): void
} {
  const { count } = useUnreadCount()
  const { items } = useNotifications()
  const { markRead } = useMarkRead()

  return {
    label: count > 0 ? `Уведомления, непрочитанных: ${count}` : 'Уведомления',
    count,
    previewItems: items.slice(0, PREVIEW_SIZE),
    onShownChange: (shown) => {
      if (!shown || count === 0 || items.length === 0) return
      markRead(Math.max(...items.map((n) => n.id)))
    },
  }
}

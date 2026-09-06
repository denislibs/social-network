import { Group, Link, Placeholder } from '@vkontakte/vkui'
import { type NotificationDto, NotificationItem } from '@/entities/notification'
import { RouterAnchor } from '@/shared/lib'

/** Read-only preview list rendered inside `NotificationBell`'s popover: the caller passes
 * an already-trimmed slice (the bell shows the first 10), plus a link to the full page. */
export function NotificationsPanel({ items }: { items: NotificationDto[] }) {
  return (
    <Group mode="plain">
      {items.length === 0 ? (
        <Placeholder>Уведомлений пока нет</Placeholder>
      ) : (
        items.map((n) => <NotificationItem key={n.id} notification={n} />)
      )}
      <Link Component={RouterAnchor} href="/notifications">
        Все уведомления
      </Link>
    </Group>
  )
}

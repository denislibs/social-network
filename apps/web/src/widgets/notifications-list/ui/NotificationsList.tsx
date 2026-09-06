import { Button, Group, Placeholder } from '@vkontakte/vkui'
import { NotificationItem } from '@/entities/notification'
import { useNotifications } from '@/features/notifications'
import { NotificationsListSkeleton } from './NotificationsListSkeleton'

/** The full `/notifications` list: every notification, paginated. `NotificationBell`'s popover
 * preview reads the same `useNotifications` cache entry, so visiting this page after opening
 * the bell never re-fetches the first page. */
export function NotificationsList() {
  const { items, isPending, showSkeleton, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useNotifications()

  return (
    <Group mode="plain">
      {showSkeleton ? (
        <NotificationsListSkeleton />
      ) : isPending ? null : items.length === 0 ? (
        <Placeholder>Уведомлений пока нет</Placeholder>
      ) : (
        <>
          {items.map((n) => (
            <NotificationItem key={n.id} notification={n} />
          ))}
          {hasNextPage && (
            <Button mode="tertiary" stretched loading={isFetchingNextPage} onClick={fetchNextPage}>
              Показать ещё
            </Button>
          )}
        </>
      )}
    </Group>
  )
}

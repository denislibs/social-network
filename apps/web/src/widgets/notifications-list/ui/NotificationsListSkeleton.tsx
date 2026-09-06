import { Group, SimpleCell, Skeleton } from '@vkontakte/vkui'

/** Same row shape as `NotificationItem` (avatar + one line of text + a subtitle line), so the
 * layout doesn't jump once real data replaces the skeleton — see `UserCellSkeleton` for the
 * sibling pattern this mirrors. */
export function NotificationsListSkeleton() {
  return (
    <Group mode="plain" aria-busy="true" aria-label="Загрузка">
      {Array.from({ length: 8 }, (_, i) => (
        <SimpleCell
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder rows, never reordered
          key={i}
          before={<Skeleton width={48} height={48} borderRadius="50%" />}
          subtitle={<Skeleton width={80} />}
        >
          <Skeleton width={220} />
        </SimpleCell>
      ))}
    </Group>
  )
}

import { useQuery } from '@tanstack/react-query'
import { NOTIFICATION_GATEWAY } from '@/entities/notification'
import { useService } from '@/shared/di'
import { queryKeys } from '@/shared/lib'
import { useTabLeader } from './useTabLeader'

/**
 * Unread notification count. Only the leader tab *polls* (every 30s); the others rely on
 * `useNotificationSync` relaying the leader's value over the `TabCoordinator` broadcast channel
 * into this same cache entry (`queryKeys.notifications.unread`), so opening many tabs never
 * multiplies the polling traffic.
 *
 * Every tab still fetches on mount and on window focus, though: leadership can be held by a tab
 * that is asleep or wedged, and the leader only broadcasts when its count *changes* — so without
 * this a tab could sit on a stale badge indefinitely. One request when the user actually looks at
 * the tab is a cheap liveness floor under the broadcast.
 */
export function useUnreadCount(): { count: number; isPending: boolean } {
  const gateway = useService(NOTIFICATION_GATEWAY)
  const isLeader = useTabLeader()
  const query = useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: () => gateway.unreadCount(),
    refetchInterval: isLeader ? 30_000 : false,
    refetchOnWindowFocus: true,
  })
  return { count: query.data ?? 0, isPending: query.isPending }
}

import { useQuery } from '@tanstack/react-query'
import { NOTIFICATION_GATEWAY } from '@/entities/notification'
import { useService } from '@/shared/di'
import { queryKeys } from '@/shared/lib'
import { useTabLeader } from './useTabLeader'

/**
 * Unread notification count. Only the leader tab actually polls the server (every 30s and on
 * window focus) — non-leader tabs leave the query disabled and rely entirely on
 * `useNotificationSync` relaying the leader's value over the `TabCoordinator` broadcast channel
 * into this same cache entry (`queryKeys.notifications.unread`), so opening many tabs never
 * multiplies the polling traffic.
 */
export function useUnreadCount(): { count: number; isPending: boolean } {
  const gateway = useService(NOTIFICATION_GATEWAY)
  const isLeader = useTabLeader()
  const query = useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: () => gateway.unreadCount(),
    enabled: isLeader,
    refetchInterval: isLeader ? 30_000 : false,
    refetchOnWindowFocus: isLeader,
  })
  return { count: query.data ?? 0, isPending: query.isPending }
}

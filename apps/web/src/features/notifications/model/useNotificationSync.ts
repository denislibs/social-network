import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useService } from '@/shared/di'
import { queryKeys, TAB_COORDINATOR } from '@/shared/lib'
import { useDocumentTitle } from './useDocumentTitle'
import { useTabLeader } from './useTabLeader'
import { useUnreadCount } from './useUnreadCount'

/**
 * Mounted once per tab (see `app/composition/NotificationSync.tsx`), only while authed:
 * - Every tab subscribes to the `TabCoordinator` broadcast channel: `notifications:changed`
 *   writes the leader's polled count straight into this tab's own `unread` cache (so non-leader
 *   tabs never poll the server themselves) and invalidates the list; `notifications:read` (sent
 *   by `useMarkRead` after a successful mark-read, from whichever tab the user acted in)
 *   invalidates both, so every tab drops its read badges.
 * - Only the leader tab (`useUnreadCount` already gates the actual polling on `useTabLeader`)
 *   re-broadcasts `notifications:changed` when its polled count changes, so the other tabs pick
 *   it up via the branch above.
 * - Every tab mirrors the (now-synced) count into the document title.
 */
export function useNotificationSync(): void {
  const coordinator = useService(TAB_COORDINATOR)
  const queryClient = useQueryClient()
  const isLeader = useTabLeader()
  const { count } = useUnreadCount()

  useEffect(
    () =>
      coordinator.subscribe((msg) => {
        if (msg.type === 'notifications:changed') {
          queryClient.setQueryData(queryKeys.notifications.unread, msg.unread)
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list })
        } else if (msg.type === 'notifications:read') {
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread })
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list })
        }
      }),
    [coordinator, queryClient],
  )

  // Tracks the last count *this* tab broadcast as leader, so leadership changing hands (or a
  // no-op re-render) doesn't re-announce a value the other tabs already have.
  const lastAnnounced = useRef<number | null>(null)
  useEffect(() => {
    if (!isLeader) {
      lastAnnounced.current = null
      return
    }
    if (lastAnnounced.current === count) return
    lastAnnounced.current = count
    coordinator.broadcast({ type: 'notifications:changed', unread: count })
  }, [isLeader, count, coordinator])

  useDocumentTitle(count)
}

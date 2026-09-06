import { useMutation, useQueryClient } from '@tanstack/react-query'
import { NOTIFICATION_GATEWAY } from '@/entities/notification'
import { useService } from '@/shared/di'
import { queryKeys, TAB_COORDINATOR } from '@/shared/lib'

/**
 * Marks every notification up to `uptoId` read. On success the server's remaining-unread count
 * is written straight into the cache (no refetch needed), the list is invalidated so read
 * badges disappear, and the other tabs are told via `notifications:read` so they invalidate too.
 */
export function useMarkRead(): { markRead(uptoId: number): void } {
  const gateway = useService(NOTIFICATION_GATEWAY)
  const coordinator = useService(TAB_COORDINATOR)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (uptoId: number) => gateway.markRead(uptoId),
    onSuccess: (count, uptoId) => {
      queryClient.setQueryData(queryKeys.notifications.unread, count)
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list })
      coordinator.broadcast({ type: 'notifications:read', uptoId })
    },
  })

  return { markRead: (uptoId: number) => mutation.mutate(uptoId) }
}

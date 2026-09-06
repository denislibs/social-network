import { useInfiniteQuery } from '@tanstack/react-query'
import { NOTIFICATION_GATEWAY, type NotificationDto } from '@/entities/notification'
import { useService } from '@/shared/di'
import { queryKeys, useDelayedPending } from '@/shared/lib'

/**
 * Cursor-paginated notification feed. `NotificationBell`'s popover and the `/notifications`
 * page both call this hook against the same `queryKeys.notifications.list` cache entry — the
 * bell just renders the first page's first 10 rows, so opening it never issues a second request
 * once the full list has already been fetched once.
 */
export function useNotifications(): {
  items: NotificationDto[]
  isPending: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage(): void
} {
  const gateway = useService(NOTIFICATION_GATEWAY)
  const query = useInfiniteQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: ({ pageParam }) => gateway.list(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
  const isPending = useDelayedPending(query.isPending)
  const items = query.data?.pages.flatMap((page) => page.items) ?? []
  return {
    items,
    isPending,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => {
      void query.fetchNextPage()
    },
  }
}

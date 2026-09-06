import { useInfiniteQuery } from '@tanstack/react-query'
import { USER_GATEWAY, type UserCellDto } from '@/entities/user'
import { useService } from '@/shared/di'
import { queryKeys, useDelayedPending } from '@/shared/lib'

export function useFriendsList(userId: number): {
  items: UserCellDto[]
  isPending: boolean
  isError: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
} {
  const gateway = useService(USER_GATEWAY)
  const query = useInfiniteQuery({
    queryKey: queryKeys.user.friends(userId),
    queryFn: ({ pageParam }) => gateway.getFriends(userId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
  const isPending = useDelayedPending(query.isPending)
  const items = query.data?.pages.flatMap((page) => page.items) ?? []
  return {
    items,
    isPending,
    isError: query.isError,
    hasNextPage: query.hasNextPage,
    fetchNextPage: () => {
      void query.fetchNextPage()
    },
  }
}

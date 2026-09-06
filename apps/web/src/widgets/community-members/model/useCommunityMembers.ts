import { useInfiniteQuery } from '@tanstack/react-query'
import { COMMUNITY_GATEWAY } from '@/entities/community'
import type { UserCellDto } from '@/entities/user'
import { useService } from '@/shared/di'
import { queryKeys, useDelayedPending } from '@/shared/lib'

export function useCommunityMembers(id: number): {
  items: UserCellDto[]
  isPending: boolean
  showSkeleton: boolean
  isError: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
} {
  const gateway = useService(COMMUNITY_GATEWAY)
  const query = useInfiniteQuery({
    queryKey: queryKeys.community.members(id),
    queryFn: ({ pageParam }) => gateway.members(id, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
  const showSkeleton = useDelayedPending(query.isPending)
  const items = query.data?.pages.flatMap((page) => page.items) ?? []
  return {
    items,
    isPending: query.isPending,
    showSkeleton,
    isError: query.isError,
    hasNextPage: query.hasNextPage,
    fetchNextPage: () => {
      void query.fetchNextPage()
    },
  }
}

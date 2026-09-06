import { useQuery } from '@tanstack/react-query'
import { COMMUNITY_GATEWAY, type CommunityCellDto } from '@/entities/community'
import { useService } from '@/shared/di'
import { queryKeys, useDelayedPending } from '@/shared/lib'

export function useMyCommunities(): {
  items: CommunityCellDto[]
  isPending: boolean
  showSkeleton: boolean
  isError: boolean
} {
  const gateway = useService(COMMUNITY_GATEWAY)
  const query = useQuery({
    queryKey: queryKeys.community.mine,
    queryFn: () => gateway.mine(),
  })
  const showSkeleton = useDelayedPending(query.isPending)
  return {
    items: query.data ?? [],
    isPending: query.isPending,
    showSkeleton,
    isError: query.isError,
  }
}

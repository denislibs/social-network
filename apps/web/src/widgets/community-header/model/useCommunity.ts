import { useQuery } from '@tanstack/react-query'
import { COMMUNITY_GATEWAY, type CommunityDto } from '@/entities/community'
import { useService } from '@/shared/di'
import { queryKeys, useDelayedPending } from '@/shared/lib'

export function useCommunity(handle: string): {
  community: CommunityDto | undefined
  isPending: boolean
  isError: boolean
} {
  const gateway = useService(COMMUNITY_GATEWAY)
  const query = useQuery({
    queryKey: queryKeys.community.get(handle),
    queryFn: () => gateway.get(handle),
  })
  const isPending = useDelayedPending(query.isPending)
  return { community: query.data, isPending, isError: query.isError }
}

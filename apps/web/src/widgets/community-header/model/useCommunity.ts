import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { COMMUNITY_GATEWAY, type CommunityDto, communityHandle } from '@/entities/community'
import { useService } from '@/shared/di'
import { queryKeys, useDelayedPending } from '@/shared/lib'

export function useCommunity(handle: string): {
  community: CommunityDto | undefined
  isPending: boolean
  showSkeleton: boolean
  isError: boolean
} {
  const gateway = useService(COMMUNITY_GATEWAY)
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: queryKeys.community.get(handle),
    queryFn: () => gateway.get(handle),
  })
  const showSkeleton = useDelayedPending(query.isPending)
  const community = query.data

  // The URL handle is only one of a community's names: `/club7`, `/kino` and `/KINO` all resolve
  // to the same community but produce different query keys. Seeding the canonical screen-name key
  // and the numeric-id one means a later visit under another alias renders from cache instead of
  // re-fetching, and the membership mutations (which match every `['community', …]` entry holding
  // this DTO — see `features/community-membership/model/cache.ts`) update all of them at once.
  useEffect(() => {
    if (!community) return
    for (const key of [
      queryKeys.community.get(communityHandle(community)),
      queryKeys.community.byId(community.id),
    ]) {
      if (queryClient.getQueryData(key) !== community) queryClient.setQueryData(key, community)
    }
  }, [community, queryClient])

  return { community, isPending: query.isPending, showSkeleton, isError: query.isError }
}

import { useQuery } from '@tanstack/react-query'
import { COMMUNITY_GATEWAY, type CommunityCellDto } from '@/entities/community'
import { useService } from '@/shared/di'
import { queryKeys, useDelayedPending } from '@/shared/lib'

export function useMyCommunities(): {
  items: CommunityCellDto[]
  isPending: boolean
  isError: boolean
} {
  const gateway = useService(COMMUNITY_GATEWAY)
  const query = useQuery({
    queryKey: queryKeys.community.mine,
    queryFn: () => gateway.mine(),
  })
  const isPending = useDelayedPending(query.isPending)
  return { items: query.data ?? [], isPending, isError: query.isError }
}

import { useQuery } from '@tanstack/react-query'
import { USER_GATEWAY, type UserCellDto } from '@/entities/user'
import { useService } from '@/shared/di'
import { queryKeys, useDelayedPending } from '@/shared/lib'

export function useFriendRequests(dir: 'incoming' | 'outgoing'): {
  items: UserCellDto[]
  isPending: boolean
  isError: boolean
} {
  const gateway = useService(USER_GATEWAY)
  const query = useQuery({
    queryKey: queryKeys.user.requests(dir),
    queryFn: () => gateway.getRequests(dir, null),
  })
  const isPending = useDelayedPending(query.isPending)
  return { items: query.data?.items ?? [], isPending, isError: query.isError }
}

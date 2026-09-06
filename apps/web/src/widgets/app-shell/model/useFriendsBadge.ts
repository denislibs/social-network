import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/entities/session'
import { USER_GATEWAY } from '@/entities/user'
import { useService } from '@/shared/di'
import { queryKeys } from '@/shared/lib'

/** Incoming friend-request count for the `SideNav` "Друзья" badge, `0` when signed out. */
export function useFriendsBadge(): { count: number } {
  const { user, status } = useSession()
  const gateway = useService(USER_GATEWAY)
  const authed = status === 'authed' && user !== null
  const query = useQuery({
    queryKey: queryKeys.user.counters(user?.id ?? 0),
    queryFn: () => gateway.getMyCounters(),
    enabled: authed,
  })
  return { count: authed ? (query.data?.incomingRequests ?? 0) : 0 }
}

import { useQuery } from '@tanstack/react-query'
import { useDeferredValue } from 'react'
import { COMMUNITY_GATEWAY, type CommunityCellDto } from '@/entities/community'
import { USER_GATEWAY, type UserCellDto } from '@/entities/user'
import { useService } from '@/shared/di'
import { queryKeys, useDelayedPending } from '@/shared/lib'

export type SearchKind = 'all' | 'users' | 'communities'

type SearchData = { users: UserCellDto[]; communities: CommunityCellDto[] }

/**
 * `useDeferredValue` (not a real debounce timer) lags one render behind `q`: several rapid
 * updates to `q` collapse into a single deferred value once React catches up, so only the
 * final query fires. Disabled below two characters via `enabled`, matching the backend's
 * `GET /search` minimum. Runs `USER_GATEWAY.searchUsers`/`COMMUNITY_GATEWAY.search` in
 * parallel rather than adding a combined gateway method, since both already exist and a
 * third "search everything" port would just duplicate their union.
 */
export function useSearch(
  q: string,
  kind: SearchKind,
): {
  users: UserCellDto[]
  communities: CommunityCellDto[]
  isPending: boolean
  showSkeleton: boolean
  enabled: boolean
} {
  const userGateway = useService(USER_GATEWAY)
  const communityGateway = useService(COMMUNITY_GATEWAY)
  const deferred = useDeferredValue(q)
  const enabled = deferred.trim().length >= 2

  const query = useQuery<SearchData>({
    queryKey: queryKeys.search(deferred, kind),
    enabled,
    queryFn: async () => {
      const [users, communities] = await Promise.all([
        kind === 'communities'
          ? Promise.resolve<UserCellDto[]>([])
          : userGateway.searchUsers(deferred),
        kind === 'users'
          ? Promise.resolve<CommunityCellDto[]>([])
          : communityGateway.search(deferred),
      ])
      return { users, communities }
    },
  })

  const isPending = enabled && query.isPending
  const showSkeleton = useDelayedPending(isPending)

  return {
    users: query.data?.users ?? [],
    communities: query.data?.communities ?? [],
    isPending,
    showSkeleton,
    enabled,
  }
}

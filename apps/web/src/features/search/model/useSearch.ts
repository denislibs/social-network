import { useQuery } from '@tanstack/react-query'
import { COMMUNITY_GATEWAY, type CommunityCellDto } from '@/entities/community'
import { USER_GATEWAY, type UserCellDto } from '@/entities/user'
import { useService } from '@/shared/di'
import { queryKeys, useDebouncedValue, useDelayedPending } from '@/shared/lib'

export type SearchKind = 'all' | 'users' | 'communities'

type SearchData = { users: UserCellDto[]; communities: CommunityCellDto[] }

/** Typing pause, in ms, before a query is actually sent. */
const DEBOUNCE_MS = 300

/**
 * Debounces `q` by {@link DEBOUNCE_MS} so a burst of keystrokes costs one request, not one per
 * letter (`useDeferredValue`, which this replaced, only lags a render — on a fast machine React
 * caught up between keystrokes and every letter hit the network). Stays disabled below two
 * characters via `enabled`, which the backend enforces too (`GET /search`, `minLength: 2`). Runs
 * `USER_GATEWAY.searchUsers`/`COMMUNITY_GATEWAY.search` in parallel rather than adding a combined
 * gateway method, since both already exist and a third "search everything" port would just
 * duplicate their union.
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
  const debounced = useDebouncedValue(q, DEBOUNCE_MS)
  const enabled = debounced.trim().length >= 2

  const query = useQuery<SearchData>({
    queryKey: queryKeys.search(debounced, kind),
    enabled,
    queryFn: async () => {
      const [users, communities] = await Promise.all([
        kind === 'communities'
          ? Promise.resolve<UserCellDto[]>([])
          : userGateway.searchUsers(debounced),
        kind === 'users'
          ? Promise.resolve<CommunityCellDto[]>([])
          : communityGateway.search(debounced),
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

import { useQuery } from '@tanstack/react-query'
import type { ProfileDto, Relation } from '@/entities/user'
import { queryKeys } from '@/shared/lib'

/**
 * Reads the friend-relation cache seeded from the profile fetch. `useFriendAction`'s mutation
 * (features/friendship) writes `queryKeys.user.relation(id)` on every optimistic update and on
 * success, so subscribing to that key here — instead of reading `profile.relation` directly —
 * keeps `ProfileCard` in sync with friend actions taken elsewhere without a page reload.
 * `staleTime: Infinity` means this query never refetches on its own: only the mutation's cache
 * writes change it after the initial seed from `profile.relation`.
 */
export function useRelation(profile: ProfileDto): Relation {
  const query = useQuery({
    queryKey: queryKeys.user.relation(profile.id),
    queryFn: () => Promise.resolve(profile.relation),
    initialData: profile.relation,
    staleTime: Number.POSITIVE_INFINITY,
  })
  return query.data
}

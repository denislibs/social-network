import { useQuery } from '@tanstack/react-query'
import type { Relation } from '@/entities/user'
import { queryKeys } from '@/shared/lib'

/**
 * Reads `queryKeys.user.relation(userId)` from the shared cache, seeded to `'none'` (every
 * suggestion is, by construction, someone not yet a friend). `useFriendAction`'s mutation
 * writes to this exact key on click (`onMutate`) and on success, so once wired into
 * `PymkBlock` the button re-renders with the live relation instead of a hardcoded `'none'` —
 * fixing the bug where it kept reading "Добавить в друзья" after a request was sent.
 * `staleTime: Infinity` means this never triggers its own network request: the query only
 * ever reads whatever `useFriendAction` (or a profile visit) has already put in the cache.
 */
export function useSuggestionRelation(userId: number): Relation {
  const query = useQuery({
    queryKey: queryKeys.user.relation(userId),
    queryFn: () => 'none' as Relation,
    initialData: 'none' as Relation,
    staleTime: Infinity,
  })
  return query.data
}

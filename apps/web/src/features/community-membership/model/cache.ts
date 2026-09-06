import type { Query, QueryClient } from '@tanstack/react-query'
import type { CommunityDto } from '@/entities/community'

/**
 * A community is cached under whatever handle the URL used: `/club7` fetches into
 * `['community', 'club7']`, `/kino` into `['community', 'kino']`, and `useCommunity` seeds
 * `['community', 'id', 7]` alongside. A mutation only holds the DTO, so it cannot reconstruct
 * the handle the viewer arrived by — matching on the *cached value* instead of the key finds
 * every alias at once, and skips the sibling `['community', 'members', …]` entries (whose data
 * is a page of users, not a `CommunityDto`) for free.
 */
export function communityDetailFilter(id: number): { predicate: (q: Query) => boolean } {
  return {
    predicate: (q: Query) =>
      q.queryKey[0] === 'community' && (q.state.data as CommunityDto | undefined)?.id === id,
  }
}

/** Every cached alias of this community, as `[key, dto]` pairs, for optimistic rollback. */
export function snapshotCommunity(
  queryClient: QueryClient,
  id: number,
): [readonly unknown[], CommunityDto | undefined][] {
  return queryClient.getQueriesData<CommunityDto>(communityDetailFilter(id))
}

export function restoreCommunity(
  queryClient: QueryClient,
  snapshot: [readonly unknown[], CommunityDto | undefined][],
): void {
  for (const [key, data] of snapshot) queryClient.setQueryData(key, data)
}

/** Applies `update` to every cached alias of this community. */
export function patchCommunity(
  queryClient: QueryClient,
  id: number,
  update: (old: CommunityDto) => CommunityDto,
): void {
  queryClient.setQueriesData<CommunityDto>(communityDetailFilter(id), (old) =>
    old ? update(old) : old,
  )
}

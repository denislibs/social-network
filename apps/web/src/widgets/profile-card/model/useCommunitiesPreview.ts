import { useQuery } from '@tanstack/react-query'
import { COMMUNITY_GATEWAY, type CommunityCellDto } from '@/entities/community'
import { useService } from '@/shared/di'
import { queryKeys } from '@/shared/lib'

/** How many communities vk.ru lists in the profile's right column before "Все". */
export const COMMUNITIES_PREVIEW_SIZE = 5

/**
 * Communities of the signed-in user for the profile right column. Uses exactly the same query key
 * and fetcher as `widgets/communities-list`'s `useMyCommunities`, so the two share one cache entry
 * and one request — the duplication is a Steiger constraint (sibling widget slices cannot import
 * each other), not a second round trip. `enabled` is false on someone else's profile, where the
 * API exposes only the count.
 */
export function useCommunitiesPreview(enabled: boolean): { items: CommunityCellDto[] } {
  const gateway = useService(COMMUNITY_GATEWAY)
  const query = useQuery({
    queryKey: queryKeys.community.mine,
    queryFn: () => gateway.mine(),
    enabled,
  })
  return { items: (query.data ?? []).slice(0, COMMUNITIES_PREVIEW_SIZE) }
}

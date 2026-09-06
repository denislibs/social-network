import { useQuery } from '@tanstack/react-query'
import { COMMUNITY_GATEWAY } from '@/entities/community'
import type { UserCellDto } from '@/entities/user'
import { useService } from '@/shared/di'
import { queryKeys, useDelayedPending } from '@/shared/lib'

/** How many members vk.ru shows in the community's right column (a 3×2 grid of avatars). */
export const MEMBERS_PREVIEW_SIZE = 6

/**
 * First page of a community's members, for the right-column grid. Deliberately its own query key
 * (`community/members/preview/:id`) rather than reusing `widgets/community-members`'s infinite
 * query: the two live in sibling widget slices that Steiger forbids from importing each other,
 * and an infinite query and a plain one cannot share a cache entry — the same trade-off
 * `useFriendsPreview` documents on the profile side. The shared `community/members` prefix still
 * means an invalidation targeting that prefix refreshes both.
 */
export function useMembersPreview(communityId: number): {
  items: UserCellDto[]
  isPending: boolean
  isError: boolean
} {
  const gateway = useService(COMMUNITY_GATEWAY)
  const query = useQuery({
    queryKey: queryKeys.community.membersPreview(communityId),
    queryFn: () => gateway.members(communityId, null),
  })
  const isPending = useDelayedPending(query.isPending)
  return {
    items: (query.data?.items ?? []).slice(0, MEMBERS_PREVIEW_SIZE),
    isPending,
    isError: query.isError,
  }
}

import { useQuery } from '@tanstack/react-query'
import { USER_GATEWAY, type UserCellDto } from '@/entities/user'
import { useService } from '@/shared/di'
import { queryKeys, useDelayedPending } from '@/shared/lib'

/** How many friends vk.ru shows in the profile's right column (a 3×2 grid of avatars). */
export const FRIENDS_PREVIEW_SIZE = 6

/**
 * First page of a user's friends, for the profile right-column grid. Deliberately its own query
 * key (`friends/preview/:id`) rather than reusing `widgets/friends-list`'s infinite query: the two
 * live in sibling widget slices that Steiger forbids from importing each other, and an infinite
 * query and a plain one cannot share a cache entry. The shared `friends` prefix still means a
 * friend-action invalidation refreshes both.
 */
export function useFriendsPreview(userId: number): {
  items: UserCellDto[]
  isPending: boolean
  isError: boolean
} {
  const gateway = useService(USER_GATEWAY)
  const query = useQuery({
    queryKey: queryKeys.user.friendsPreview(userId),
    queryFn: () => gateway.getFriends(userId, null),
  })
  const isPending = useDelayedPending(query.isPending)
  return {
    items: (query.data?.items ?? []).slice(0, FRIENDS_PREVIEW_SIZE),
    isPending,
    isError: query.isError,
  }
}

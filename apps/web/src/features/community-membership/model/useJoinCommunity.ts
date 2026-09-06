import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { COMMUNITY_GATEWAY, type CommunityDto } from '@/entities/community'
import { useService } from '@/shared/di'
import { queryKeys } from '@/shared/lib'
import { communityDetailFilter, patchCommunity, restoreCommunity, snapshotCommunity } from './cache'
import { codeOf, messageFor } from './errors'

type Action = 'join' | 'leave'
type Result = { membership: CommunityDto['membership']; isFollowing: boolean }
type Snapshot = ReturnType<typeof snapshotCommunity>

export function useJoinCommunity(community: CommunityDto): {
  label: string
  onClick(): void
  busy: boolean
  secondary?: { label: string; onClick(): void }
  error: string | null
  dismissError(): void
} {
  const gateway = useService(COMMUNITY_GATEWAY)
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const filter = communityDetailFilter(community.id)

  const mutation = useMutation<Result, unknown, Action, { previous: Snapshot }>({
    mutationFn: (action) =>
      action === 'join' ? gateway.join(community.id) : gateway.leave(community.id),
    onMutate: async (action) => {
      setError(null)
      await queryClient.cancelQueries(filter)
      const previous = snapshotCommunity(queryClient, community.id)
      patchCommunity(queryClient, community.id, (old) =>
        action === 'join'
          ? { ...old, membership: 'member', isFollowing: true, membersCount: old.membersCount + 1 }
          : {
              ...old,
              membership: 'none',
              isFollowing: false,
              membersCount: Math.max(0, old.membersCount - 1),
            },
      )
      return { previous }
    },
    onError: (err, _action, context) => {
      if (context) restoreCommunity(queryClient, context.previous)
      setError(messageFor(codeOf(err)))
    },
    onSuccess: (result) => {
      patchCommunity(queryClient, community.id, (old) => ({ ...old, ...result }))
      queryClient.invalidateQueries({ queryKey: queryKeys.community.mine })
      // The viewer's own communities counter (`queryKeys.user.counters(viewerId)`, key[0]
      // === 'counters') isn't known here — this hook only has the community, not "me"'s id —
      // so it's invalidated by predicate, same trick `useFriendAction` uses.
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'counters' })
      // Same trick for the member lists (`community.members(id)` / `community.membersPreview(id)`):
      // match any `['community', ..., 'members', ...]` key rather than the exact tuple, so a
      // join/leave refreshes whoever is viewing this community's member list right now.
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'community' && q.queryKey.includes('members'),
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries(filter)
    },
  })

  const dismissError = useCallback(() => setError(null), [])
  const busy = mutation.isPending

  if (community.membership === 'none') {
    return {
      label: 'Вступить',
      onClick: () => mutation.mutate('join'),
      busy,
      error,
      dismissError,
    }
  }
  return {
    label: 'Вы участник',
    onClick: () => {},
    busy,
    secondary: { label: 'Выйти', onClick: () => mutation.mutate('leave') },
    error,
    dismissError,
  }
}

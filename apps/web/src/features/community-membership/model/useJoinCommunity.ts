import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { COMMUNITY_GATEWAY, type CommunityDto, communityHandle } from '@/entities/community'
import { useService } from '@/shared/di'
import { queryKeys } from '@/shared/lib'
import { codeOf, messageFor } from './errors'

type Action = 'join' | 'leave'
type Result = { membership: CommunityDto['membership']; isFollowing: boolean }

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
  const key = queryKeys.community.get(communityHandle(community))

  const mutation = useMutation<Result, unknown, Action, { previous: CommunityDto | undefined }>({
    mutationFn: (action) =>
      action === 'join' ? gateway.join(community.id) : gateway.leave(community.id),
    onMutate: async (action) => {
      setError(null)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<CommunityDto>(key)
      queryClient.setQueryData<CommunityDto>(key, (old) => {
        const base = old ?? community
        return action === 'join'
          ? {
              ...base,
              membership: 'member',
              isFollowing: true,
              membersCount: base.membersCount + 1,
            }
          : {
              ...base,
              membership: 'none',
              isFollowing: false,
              membersCount: Math.max(0, base.membersCount - 1),
            }
      })
      return { previous }
    },
    onError: (err, _action, context) => {
      queryClient.setQueryData(key, context?.previous ?? community)
      setError(messageFor(codeOf(err)))
    },
    onSuccess: (result) => {
      queryClient.setQueryData<CommunityDto>(key, (old) => (old ? { ...old, ...result } : old))
      queryClient.invalidateQueries({ queryKey: queryKeys.community.mine })
      // The viewer's own communities counter (`queryKeys.user.counters(viewerId)`, key[0]
      // === 'counters') isn't known here — this hook only has the community, not "me"'s id —
      // so it's invalidated by predicate, same trick `useFriendAction` uses.
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'counters' })
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

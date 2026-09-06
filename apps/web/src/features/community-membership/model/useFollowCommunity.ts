import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { COMMUNITY_GATEWAY, type CommunityDto } from '@/entities/community'
import { useService } from '@/shared/di'
import { communityDetailFilter, patchCommunity, restoreCommunity, snapshotCommunity } from './cache'
import { codeOf, messageFor } from './errors'

const FALLBACK_MESSAGE = 'Не удалось изменить подписку'

type Snapshot = ReturnType<typeof snapshotCommunity>

export function useFollowCommunity(community: CommunityDto): {
  label: string
  onClick(): void
  busy: boolean
  error: string | null
  dismissError(): void
} {
  const gateway = useService(COMMUNITY_GATEWAY)
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const filter = communityDetailFilter(community.id)
  const wasFollowing = community.isFollowing

  const mutation = useMutation<{ isFollowing: boolean }, unknown, void, { previous: Snapshot }>({
    mutationFn: () =>
      wasFollowing ? gateway.unfollow(community.id) : gateway.follow(community.id),
    onMutate: async () => {
      setError(null)
      await queryClient.cancelQueries(filter)
      const previous = snapshotCommunity(queryClient, community.id)
      patchCommunity(queryClient, community.id, (old) => ({ ...old, isFollowing: !wasFollowing }))
      return { previous }
    },
    onError: (err, _vars, context) => {
      if (context) restoreCommunity(queryClient, context.previous)
      setError(messageFor(codeOf(err), FALLBACK_MESSAGE))
    },
    onSuccess: (result) => {
      patchCommunity(queryClient, community.id, (old) => ({
        ...old,
        isFollowing: result.isFollowing,
      }))
    },
  })

  const dismissError = useCallback(() => setError(null), [])

  return {
    label: wasFollowing ? 'Вы подписаны' : 'Подписаться',
    onClick: () => mutation.mutate(),
    busy: mutation.isPending,
    error,
    dismissError,
  }
}

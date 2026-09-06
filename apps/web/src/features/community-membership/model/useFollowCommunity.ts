import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { COMMUNITY_GATEWAY, type CommunityDto, communityHandle } from '@/entities/community'
import { useService } from '@/shared/di'
import { queryKeys } from '@/shared/lib'
import { codeOf, messageFor } from './errors'

const FALLBACK_MESSAGE = 'Не удалось изменить подписку'

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
  const key = queryKeys.community.get(communityHandle(community))
  const wasFollowing = community.isFollowing

  const mutation = useMutation<
    { isFollowing: boolean },
    unknown,
    void,
    { previous: CommunityDto | undefined }
  >({
    mutationFn: () =>
      wasFollowing ? gateway.unfollow(community.id) : gateway.follow(community.id),
    onMutate: async () => {
      setError(null)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<CommunityDto>(key)
      queryClient.setQueryData<CommunityDto>(key, (old) =>
        old ? { ...old, isFollowing: !wasFollowing } : old,
      )
      return { previous }
    },
    onError: (err, _vars, context) => {
      queryClient.setQueryData(key, context?.previous ?? community)
      setError(messageFor(codeOf(err), FALLBACK_MESSAGE))
    },
    onSuccess: (result) => {
      queryClient.setQueryData<CommunityDto>(key, (old) =>
        old ? { ...old, isFollowing: result.isFollowing } : old,
      )
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

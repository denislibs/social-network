import { useMutation, useQueryClient } from '@tanstack/react-query'
import { COMMUNITY_GATEWAY, type CommunityDto, communityHandle } from '@/entities/community'
import { useService } from '@/shared/di'
import { queryKeys } from '@/shared/lib'

export function useFollowCommunity(community: CommunityDto): {
  label: string
  onClick(): void
  busy: boolean
} {
  const gateway = useService(COMMUNITY_GATEWAY)
  const queryClient = useQueryClient()
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
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<CommunityDto>(key)
      queryClient.setQueryData<CommunityDto>(key, (old) =>
        old ? { ...old, isFollowing: !wasFollowing } : old,
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(key, context?.previous ?? community)
    },
    onSuccess: (result) => {
      queryClient.setQueryData<CommunityDto>(key, (old) =>
        old ? { ...old, isFollowing: result.isFollowing } : old,
      )
    },
  })

  return {
    label: wasFollowing ? 'Вы подписаны' : 'Подписаться',
    onClick: () => mutation.mutate(),
    busy: mutation.isPending,
  }
}

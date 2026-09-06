import { useQuery } from '@tanstack/react-query'
import { type ProfileDto, USER_GATEWAY } from '@/entities/user'
import { useService } from '@/shared/di'
import { queryKeys, useDelayedPending } from '@/shared/lib'

export function useProfile(handle: string): {
  profile: ProfileDto | undefined
  isPending: boolean
  showSkeleton: boolean
  isError: boolean
} {
  const gateway = useService(USER_GATEWAY)
  const query = useQuery({
    queryKey: queryKeys.user.profile(handle),
    queryFn: () => gateway.getProfile(handle),
  })
  const showSkeleton = useDelayedPending(query.isPending)
  return { profile: query.data, isPending: query.isPending, showSkeleton, isError: query.isError }
}

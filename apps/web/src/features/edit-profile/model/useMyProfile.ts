import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/entities/session'
import { type ProfileDto, USER_GATEWAY, userHandle } from '@/entities/user'
import { useService } from '@/shared/di'
import { queryKeys, useDelayedPending } from '@/shared/lib'

export function useMyProfile(): {
  profile: ProfileDto | undefined
  isPending: boolean
  showSkeleton: boolean
  isError: boolean
} {
  const gateway = useService(USER_GATEWAY)
  const { user } = useSession()
  const handle = user ? userHandle(user) : ''
  const query = useQuery({
    queryKey: queryKeys.user.profile(handle),
    queryFn: () => gateway.getProfile(handle),
    enabled: handle.length > 0,
  })
  const showSkeleton = useDelayedPending(query.isPending)
  return { profile: query.data, isPending: query.isPending, showSkeleton, isError: query.isError }
}

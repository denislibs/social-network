import { useQuery } from '@tanstack/react-query'
import type { HandleDto } from '@/entities/user'
import { USER_GATEWAY } from '@/entities/user'
import { useService } from '@/shared/di'
import { queryKeys, useDelayedPending } from '@/shared/lib'

export function useHandle(handle: string): {
  data: HandleDto | undefined
  isPending: boolean
  showSkeleton: boolean
  isError: boolean
} {
  const gateway = useService(USER_GATEWAY)
  const query = useQuery({
    queryKey: queryKeys.user.handle(handle),
    queryFn: () => gateway.resolve(handle),
  })
  const showSkeleton = useDelayedPending(query.isPending)
  return { data: query.data, isPending: query.isPending, showSkeleton, isError: query.isError }
}

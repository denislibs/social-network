import { useQuery } from '@tanstack/react-query'
import type { HandleDto } from '@/entities/user'
import { USER_GATEWAY } from '@/entities/user'
import { useService } from '@/shared/di'

export function useHandle(handle: string): {
  data: HandleDto | undefined
  isPending: boolean
  isError: boolean
} {
  const gateway = useService(USER_GATEWAY)
  const query = useQuery({
    queryKey: ['handle', handle] as const,
    queryFn: () => gateway.resolve(handle),
  })
  return { data: query.data, isPending: query.isPending, isError: query.isError }
}

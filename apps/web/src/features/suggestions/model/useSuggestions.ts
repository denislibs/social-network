import { useQuery } from '@tanstack/react-query'
import { useService } from '@/shared/di'
import { queryKeys, useDelayedPending } from '@/shared/lib'
import { SUGGESTIONS_GATEWAY } from './ports'

export function useSuggestions() {
  const gateway = useService(SUGGESTIONS_GATEWAY)
  const query = useQuery({
    queryKey: queryKeys.user.suggestions,
    queryFn: () => gateway.list(),
  })
  const isPending = useDelayedPending(query.isPending)
  return { items: query.data ?? [], isPending, isError: query.isError }
}

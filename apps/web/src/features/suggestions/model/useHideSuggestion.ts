import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import type { SuggestionDto } from '@/entities/user'
import { useService } from '@/shared/di'
import { queryKeys } from '@/shared/lib'
import { SUGGESTIONS_GATEWAY } from './ports'

export function useHideSuggestion(): { hide(userId: number): void } {
  const gateway = useService(SUGGESTIONS_GATEWAY)
  const queryClient = useQueryClient()

  const mutation = useMutation<void, unknown, number, { previous: SuggestionDto[] | undefined }>({
    mutationFn: (userId) => gateway.hide(userId),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.user.suggestions })
      const previous = queryClient.getQueryData<SuggestionDto[]>(queryKeys.user.suggestions)
      queryClient.setQueryData<SuggestionDto[]>(queryKeys.user.suggestions, (items) =>
        (items ?? []).filter((s) => s.id !== userId),
      )
      return { previous }
    },
    onError: (_err, _userId, context) => {
      if (context) queryClient.setQueryData(queryKeys.user.suggestions, context.previous)
    },
  })

  const hide = useCallback((userId: number) => mutation.mutate(userId), [mutation])
  return { hide }
}

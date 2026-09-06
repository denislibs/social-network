import { QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SuggestionDto } from '@/entities/user'
import { queryKeys, withProviders } from '@/shared/lib'
import { fakeSuggestionsGateway, suggestionsTestContainer } from './testing'
import { useHideSuggestion } from './useHideSuggestion'

const items = [
  { id: 1, firstName: 'А', lastName: 'Б', mutual: 3, sameCity: false } as unknown as SuggestionDto,
  { id: 2, firstName: 'В', lastName: 'Г', mutual: 0, sameCity: true } as unknown as SuggestionDto,
]

describe('useHideSuggestion', () => {
  it('optimistically removes the suggestion from the cache', async () => {
    const gateway = fakeSuggestionsGateway({ hide: vi.fn().mockResolvedValue(undefined) })
    const container = suggestionsTestContainer(gateway)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(queryKeys.user.suggestions, items)

    const { result } = renderHook(() => useHideSuggestion(), {
      wrapper: withProviders(container, queryClient),
    })

    act(() => result.current.hide(1))
    await waitFor(() =>
      expect(queryClient.getQueryData(queryKeys.user.suggestions)).toEqual([items[1]]),
    )
    expect(gateway.hide).toHaveBeenCalledWith(1)
  })

  it('rolls back on error', async () => {
    const gateway = fakeSuggestionsGateway({ hide: vi.fn().mockRejectedValue(new Error('boom')) })
    const container = suggestionsTestContainer(gateway)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(queryKeys.user.suggestions, items)

    const { result } = renderHook(() => useHideSuggestion(), {
      wrapper: withProviders(container, queryClient),
    })

    act(() => result.current.hide(1))
    await waitFor(() => expect(gateway.hide).toHaveBeenCalled())
    await waitFor(() => expect(queryClient.getQueryData(queryKeys.user.suggestions)).toEqual(items))
  })
})

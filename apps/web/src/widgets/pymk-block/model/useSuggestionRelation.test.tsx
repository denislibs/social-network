import { QueryClient } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createTestContainer } from '@/shared/di'
import { queryKeys, withProviders } from '@/shared/lib'
import { useSuggestionRelation } from './useSuggestionRelation'

describe('useSuggestionRelation', () => {
  it('defaults to "none" when nothing is cached yet', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useSuggestionRelation(1), {
      wrapper: withProviders(createTestContainer(), queryClient),
    })
    expect(result.current).toBe('none')
  })

  it('reflects whatever is already cached under the relation key', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(queryKeys.user.relation(1), 'outgoing')
    const { result } = renderHook(() => useSuggestionRelation(1), {
      wrapper: withProviders(createTestContainer(), queryClient),
    })
    expect(result.current).toBe('outgoing')
  })

  it('is scoped per user id', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(queryKeys.user.relation(1), 'friends')
    const { result } = renderHook(() => useSuggestionRelation(2), {
      wrapper: withProviders(createTestContainer(), queryClient),
    })
    expect(result.current).toBe('none')
  })
})

import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { withProviders } from '@/shared/lib'
import { fakeSuggestionsGateway, suggestionsTestContainer } from './testing'
import { useSuggestions } from './useSuggestions'

describe('useSuggestions', () => {
  it('returns the items resolved by the gateway', async () => {
    const items = [{ id: 1, firstName: 'А', lastName: 'Б', mutual: 3, sameCity: false } as never]
    const gateway = fakeSuggestionsGateway({ list: vi.fn().mockResolvedValue(items) })
    const container = suggestionsTestContainer(gateway)
    const { result } = renderHook(() => useSuggestions(), { wrapper: withProviders(container) })

    await waitFor(() => expect(result.current.items).toEqual(items))
    expect(result.current.isError).toBe(false)
  })

  it('reports isError when the gateway rejects', async () => {
    const gateway = fakeSuggestionsGateway({ list: vi.fn().mockRejectedValue(new Error('boom')) })
    const container = suggestionsTestContainer(gateway)
    const { result } = renderHook(() => useSuggestions(), { wrapper: withProviders(container) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.items).toEqual([])
  })
})

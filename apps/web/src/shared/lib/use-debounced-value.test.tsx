import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './use-debounced-value'

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the initial value straight away', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 300))
    expect(result.current).toBe('a')
  })

  it('keeps the old value until the delay elapses', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    })

    rerender({ v: 'ab' })
    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('ab')
  })

  it('collapses a burst of changes into the last one', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: '' },
    })

    for (const v of ['d', 'du', 'dur', 'duro', 'durov']) {
      rerender({ v })
      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(result.current).toBe('')
    }

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('durov')
  })

  it('cancels the pending update when the value goes back to the settled one', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    })

    rerender({ v: 'ab' })
    rerender({ v: 'a' })

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe('a')
  })

  it('cleans up the timer on unmount', () => {
    const { rerender, unmount } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    })
    rerender({ v: 'ab' })

    expect(() => {
      unmount()
      vi.advanceTimersByTime(500)
    }).not.toThrow()
  })
})

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDelayedPending } from './use-delayed-pending'

describe('useDelayedPending', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false immediately, then true once still pending after delayMs', () => {
    const { result } = renderHook(() => useDelayedPending(true, 150))
    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(149)
    })
    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe(true)
  })

  it('never shows if isPending flips to false before delayMs elapses', () => {
    const { result, rerender } = renderHook(({ pending }) => useDelayedPending(pending, 150), {
      initialProps: { pending: true },
    })

    act(() => {
      vi.advanceTimersByTime(100)
    })
    rerender({ pending: false })
    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe(false)
  })

  it('hides immediately once isPending flips to false after showing', () => {
    const { result, rerender } = renderHook(({ pending }) => useDelayedPending(pending, 150), {
      initialProps: { pending: true },
    })

    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(result.current).toBe(true)

    rerender({ pending: false })
    expect(result.current).toBe(false)
  })

  it('cleans up the pending timer on unmount', () => {
    const { unmount } = renderHook(() => useDelayedPending(true, 150))
    expect(() => {
      unmount()
      vi.advanceTimersByTime(200)
    }).not.toThrow()
  })
})

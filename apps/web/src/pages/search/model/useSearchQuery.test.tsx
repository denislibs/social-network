import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { useSearchQuery } from './useSearchQuery'

function routerWrapper(initialEntry: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  }
}

describe('useSearchQuery', () => {
  it('reads q and defaults kind to "all"', () => {
    const { result } = renderHook(() => useSearchQuery(), {
      wrapper: routerWrapper('/search?q=денис'),
    })
    expect(result.current.q).toBe('денис')
    expect(result.current.kind).toBe('all')
  })

  it('reads kind from ?kind=', () => {
    const { result } = renderHook(() => useSearchQuery(), {
      wrapper: routerWrapper('/search?q=денис&kind=users'),
    })
    expect(result.current.kind).toBe('users')
  })

  it('falls back to "all" for an unknown kind', () => {
    const { result } = renderHook(() => useSearchQuery(), {
      wrapper: routerWrapper('/search?q=денис&kind=bogus'),
    })
    expect(result.current.kind).toBe('all')
  })

  it('defaults q to an empty string when absent', () => {
    const { result } = renderHook(() => useSearchQuery(), { wrapper: routerWrapper('/search') })
    expect(result.current.q).toBe('')
  })

  it('setKind updates the kind while preserving q', () => {
    const { result } = renderHook(() => useSearchQuery(), {
      wrapper: routerWrapper('/search?q=денис'),
    })
    act(() => result.current.setKind('communities'))
    expect(result.current.kind).toBe('communities')
    expect(result.current.q).toBe('денис')
  })

  it('setKind("all") drops the ?kind param', () => {
    const { result } = renderHook(() => useSearchQuery(), {
      wrapper: routerWrapper('/search?q=денис&kind=users'),
    })
    act(() => result.current.setKind('all'))
    expect(result.current.kind).toBe('all')
  })
})

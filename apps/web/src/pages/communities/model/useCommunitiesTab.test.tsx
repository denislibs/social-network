import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { useCommunitiesTab } from './useCommunitiesTab'

function routerWrapper(initialEntry: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  }
}

describe('useCommunitiesTab', () => {
  it('defaults to "mine" when there is no ?tab param', () => {
    const { result } = renderHook(() => useCommunitiesTab(), {
      wrapper: routerWrapper('/communities'),
    })
    expect(result.current.tab).toBe('mine')
  })

  it('reads "search" from ?tab=search', () => {
    const { result } = renderHook(() => useCommunitiesTab(), {
      wrapper: routerWrapper('/communities?tab=search'),
    })
    expect(result.current.tab).toBe('search')
  })

  it('falls back to "mine" for an unknown ?tab value', () => {
    const { result } = renderHook(() => useCommunitiesTab(), {
      wrapper: routerWrapper('/communities?tab=bogus'),
    })
    expect(result.current.tab).toBe('mine')
  })

  it('setTab("search") switches the tab', () => {
    const { result } = renderHook(() => useCommunitiesTab(), {
      wrapper: routerWrapper('/communities'),
    })
    act(() => result.current.setTab('search'))
    expect(result.current.tab).toBe('search')
  })

  it('setTab("mine") clears the ?tab param', () => {
    const { result } = renderHook(() => useCommunitiesTab(), {
      wrapper: routerWrapper('/communities?tab=search'),
    })
    act(() => result.current.setTab('mine'))
    expect(result.current.tab).toBe('mine')
  })
})

import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { useFriendsTab } from './useFriendsTab'

function routerWrapper(initialEntry: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  }
}

describe('useFriendsTab', () => {
  it('defaults to "all" when there is no ?tab param', () => {
    const { result } = renderHook(() => useFriendsTab(), { wrapper: routerWrapper('/friends') })
    expect(result.current.tab).toBe('all')
  })

  it('reads the tab from the ?tab search param', () => {
    const { result } = renderHook(() => useFriendsTab(), {
      wrapper: routerWrapper('/friends?tab=requests'),
    })
    expect(result.current.tab).toBe('requests')
  })

  it('falls back to "all" for an unknown ?tab value', () => {
    const { result } = renderHook(() => useFriendsTab(), {
      wrapper: routerWrapper('/friends?tab=bogus'),
    })
    expect(result.current.tab).toBe('all')
  })

  it('setTab("suggestions") switches the tab', () => {
    const { result } = renderHook(() => useFriendsTab(), { wrapper: routerWrapper('/friends') })
    act(() => result.current.setTab('suggestions'))
    expect(result.current.tab).toBe('suggestions')
  })

  it('setTab("all") clears the ?tab param', () => {
    const { result } = renderHook(() => useFriendsTab(), {
      wrapper: routerWrapper('/friends?tab=requests'),
    })
    act(() => result.current.setTab('all'))
    expect(result.current.tab).toBe('all')
  })
})

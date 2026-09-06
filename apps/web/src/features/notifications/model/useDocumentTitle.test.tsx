import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDocumentTitle } from './useDocumentTitle'

describe('useDocumentTitle', () => {
  it('sets a plain title at 0 unread', () => {
    renderHook(() => useDocumentTitle(0))
    expect(document.title).toBe('ВКлон')
  })

  it('prefixes the count when unread > 0', () => {
    renderHook(() => useDocumentTitle(3))
    expect(document.title).toBe('(3) ВКлон')
  })

  it('updates when the count changes', () => {
    const { rerender } = renderHook(({ unread }) => useDocumentTitle(unread), {
      initialProps: { unread: 1 },
    })
    expect(document.title).toBe('(1) ВКлон')
    rerender({ unread: 0 })
    expect(document.title).toBe('ВКлон')
  })

  it('resets to the plain title on unmount, so a stale badge does not linger after logout', () => {
    const { unmount } = renderHook(() => useDocumentTitle(5))
    expect(document.title).toBe('(5) ВКлон')
    unmount()
    expect(document.title).toBe('ВКлон')
  })
})

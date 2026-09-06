import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ServiceIdentifier } from './container'
import { createTestContainer, withDi } from './testing'
import { useService } from './useService'

interface Clock {
  now(): number
}
const CLOCK: ServiceIdentifier<Clock> = Symbol('Clock')

describe('useService', () => {
  it('resolves a bound service from the nearest DiProvider', () => {
    const c = createTestContainer()
    c.bind(CLOCK).toConstantValue({ now: () => 42 })
    const { result } = renderHook(() => useService(CLOCK), { wrapper: withDi(c) })
    expect(result.current.now()).toBe(42)
  })

  it('throws a readable error outside DiProvider', () => {
    expect(() => renderHook(() => useService(CLOCK))).toThrow(/DiProvider/)
  })

  it('throws a readable error for an unbound token', () => {
    const c = createTestContainer()
    expect(() => renderHook(() => useService(CLOCK), { wrapper: withDi(c) })).toThrow(/Clock/)
  })
})

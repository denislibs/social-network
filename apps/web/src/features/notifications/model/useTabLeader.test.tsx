import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createTestContainer, withDi } from '@/shared/di'
import { TAB_COORDINATOR } from '@/shared/lib'
import { fakeTabCoordinator } from './testing'
import { useTabLeader } from './useTabLeader'

describe('useTabLeader', () => {
  it('reflects the coordinator’s current leader status', () => {
    const coordinator = fakeTabCoordinator({ isLeader: () => false })
    const container = createTestContainer()
    container.bind(TAB_COORDINATOR).toConstantValue(coordinator)

    const { result } = renderHook(() => useTabLeader(), { wrapper: withDi(container) })

    expect(result.current).toBe(false)
  })

  it('updates when the coordinator announces a leader change', () => {
    let leader = false
    const listeners = new Set<(l: boolean) => void>()
    const coordinator = fakeTabCoordinator({
      isLeader: () => leader,
      onLeaderChange: (cb) => {
        listeners.add(cb)
        return () => listeners.delete(cb)
      },
    })
    const container = createTestContainer()
    container.bind(TAB_COORDINATOR).toConstantValue(coordinator)

    const { result } = renderHook(() => useTabLeader(), { wrapper: withDi(container) })
    expect(result.current).toBe(false)

    act(() => {
      leader = true
      for (const l of listeners) l(true)
    })

    expect(result.current).toBe(true)
  })
})

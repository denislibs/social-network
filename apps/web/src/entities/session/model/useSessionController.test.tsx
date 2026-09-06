import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UnauthorizedBus } from '@/shared/api'
import { withDi } from '@/shared/di'
import { fakeSessionGateway, sessionTestContainer } from './testing'
import { useSessionController } from './useSessionController'

const user = {
  id: 1,
  login: 'demo',
  firstName: 'Демо',
  lastName: 'П',
  screenName: null,
  createdAt: '',
}

function setup(
  overrides: Parameters<typeof fakeSessionGateway>[0] = {},
  bus = new UnauthorizedBus(),
) {
  const gateway = fakeSessionGateway(overrides)
  const c = sessionTestContainer(gateway, bus)
  const hook = renderHook(() => useSessionController(), { wrapper: withDi(c) })
  return { ...hook, gateway, bus }
}

describe('useSessionController', () => {
  it('becomes authed from me()', async () => {
    const { result } = setup({ me: vi.fn().mockResolvedValue(user) })
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('authed'))
    expect(result.current.user).toEqual(user)
  })

  it('becomes guest when me() resolves null', async () => {
    const { result } = setup({ me: vi.fn().mockResolvedValue(null) })
    await waitFor(() => expect(result.current.status).toBe('guest'))
    expect(result.current.user).toBeNull()
  })

  it('logs a non-401 error and becomes guest', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = setup({ me: vi.fn().mockRejectedValue(new Error('boom')) })
    await waitFor(() => expect(result.current.status).toBe('guest'))
    expect(err).toHaveBeenCalled()
    err.mockRestore()
  })

  it('setUser flips state synchronously', async () => {
    const { result } = setup({ me: vi.fn().mockResolvedValue(null) })
    await waitFor(() => expect(result.current.status).toBe('guest'))
    act(() => result.current.setUser(user))
    expect(result.current.status).toBe('authed')
    expect(result.current.user).toEqual(user)
  })

  it('logout clears state even if the request fails', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = setup({
      me: vi.fn().mockResolvedValue(user),
      logout: vi.fn().mockRejectedValue(new Error('network')),
    })
    await waitFor(() => expect(result.current.status).toBe('authed'))
    await act(() => result.current.logout())
    expect(result.current.status).toBe('guest')
    expect(err).toHaveBeenCalled()
    err.mockRestore()
  })

  it('drops to guest when the bus emits while authed', async () => {
    const { result, bus } = setup({ me: vi.fn().mockResolvedValue(user) })
    await waitFor(() => expect(result.current.status).toBe('authed'))
    act(() => bus.emit())
    await waitFor(() => expect(result.current.status).toBe('guest'))
  })

  it('ignores the bus while guest', async () => {
    const { result, bus } = setup({ me: vi.fn().mockResolvedValue(null) })
    await waitFor(() => expect(result.current.status).toBe('guest'))
    act(() => bus.emit())
    expect(result.current.status).toBe('guest')
    expect(result.current.user).toBeNull()
  })
})

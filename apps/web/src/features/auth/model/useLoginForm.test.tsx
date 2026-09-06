import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api'
import { createTestContainer, withDi } from '@/shared/di'
import { AUTH_GATEWAY, type AuthGateway } from './ports'
import { useLoginForm } from './useLoginForm'

const user = {
  id: 1,
  login: 'demo',
  firstName: 'Д',
  lastName: 'П',
  screenName: null,
  createdAt: '',
}
function setup(gateway: Partial<AuthGateway>) {
  const c = createTestContainer()
  c.bind(AUTH_GATEWAY).toConstantValue({ login: vi.fn(), register: vi.fn(), ...gateway })
  const onSuccess = vi.fn()
  const hook = renderHook(() => useLoginForm(onSuccess), { wrapper: withDi(c) })
  return { ...hook, onSuccess, gateway: c.get(AUTH_GATEWAY) }
}

describe('useLoginForm', () => {
  it('submits trimmed values and reports success', async () => {
    const { result, onSuccess, gateway } = setup({ login: vi.fn().mockResolvedValue(user) })
    act(() => {
      result.current.setField('login', '  demo ')
      result.current.setField('password', 'demo1234')
    })
    await act(() => result.current.submit())
    expect(gateway.login).toHaveBeenCalledWith({ login: 'demo', password: 'demo1234' })
    expect(onSuccess).toHaveBeenCalledWith(user)
    expect(result.current.busy).toBe(false)
  })
  it('maps invalid_credentials to a form error and clears it on next edit', async () => {
    const { result } = setup({
      login: vi.fn().mockRejectedValue(new ApiError(401, 'invalid_credentials', 'x')),
    })
    await act(() => result.current.submit())
    expect(result.current.error).toEqual({ field: 'form', text: 'Неверный логин или пароль' })
    act(() => result.current.setField('password', 'a'))
    expect(result.current.error).toBeNull()
  })
  it('is busy while the request is in flight', async () => {
    let resolve!: (u: typeof user) => void
    const { result } = setup({
      login: vi.fn(
        () =>
          new Promise<typeof user>((r) => {
            resolve = r
          }),
      ),
    })
    let p!: Promise<void>
    act(() => {
      p = result.current.submit()
    })
    expect(result.current.busy).toBe(true)
    await act(async () => {
      resolve(user)
      await p
    })
    expect(result.current.busy).toBe(false)
  })
})

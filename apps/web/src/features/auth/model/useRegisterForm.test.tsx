import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api'
import { createTestContainer, withDi } from '@/shared/di'
import { AUTH_GATEWAY, type AuthGateway } from './ports'
import { useRegisterForm } from './useRegisterForm'

const user = {
  id: 2,
  login: 'newbie',
  firstName: 'Т',
  lastName: 'Т',
  screenName: null,
  createdAt: '',
}
function setup(gateway: Partial<AuthGateway>) {
  const c = createTestContainer()
  c.bind(AUTH_GATEWAY).toConstantValue({ login: vi.fn(), register: vi.fn(), ...gateway })
  const onSuccess = vi.fn()
  const hook = renderHook(() => useRegisterForm(onSuccess), { wrapper: withDi(c) })
  return { ...hook, onSuccess, gateway: c.get(AUTH_GATEWAY) }
}

describe('useRegisterForm', () => {
  it('submits trimmed login and reports success', async () => {
    const { result, onSuccess, gateway } = setup({ register: vi.fn().mockResolvedValue(user) })
    act(() => {
      result.current.setField('login', '  newbie ')
      result.current.setField('firstName', 'Тест')
      result.current.setField('lastName', 'Тестов')
      result.current.setField('password', 'password123')
    })
    await act(() => result.current.submit())
    expect(gateway.register).toHaveBeenCalledWith({
      login: 'newbie',
      firstName: 'Тест',
      lastName: 'Тестов',
      password: 'password123',
    })
    expect(onSuccess).toHaveBeenCalledWith(user)
    expect(result.current.busy).toBe(false)
  })

  it('maps login_taken to the login field and clears it on next edit', async () => {
    const { result } = setup({
      register: vi.fn().mockRejectedValue(new ApiError(409, 'login_taken', 'x')),
    })
    await act(() => result.current.submit())
    expect(result.current.error).toEqual({ field: 'login', text: 'Логин занят' })
    act(() => result.current.setField('login', 'a'))
    expect(result.current.error).toBeNull()
  })

  it('maps weak_password to the password field', async () => {
    const { result } = setup({
      register: vi.fn().mockRejectedValue(new ApiError(422, 'weak_password', 'x')),
    })
    await act(() => result.current.submit())
    expect(result.current.error).toEqual({ field: 'password', text: 'Минимум 8 символов' })
  })

  it('is busy while the request is in flight', async () => {
    let resolve!: (u: typeof user) => void
    const { result } = setup({
      register: vi.fn(
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

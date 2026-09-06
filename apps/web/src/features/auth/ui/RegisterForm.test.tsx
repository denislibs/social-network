import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { withDi } from '@/shared/di'
import { authTestContainer, fakeAuthGateway } from '../model/testing'
import { RegisterForm } from './RegisterForm'

async function fill() {
  await userEvent.type(screen.getByLabelText('Логин'), 'newbie')
  await userEvent.type(screen.getByLabelText('Имя'), 'Тест')
  await userEvent.type(screen.getByLabelText('Фамилия'), 'Тестов')
  await userEvent.type(screen.getByLabelText('Пароль'), 'password123')
  await userEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }))
}

describe('RegisterForm', () => {
  it('registers and calls onSuccess', async () => {
    const register = vi.fn().mockResolvedValue({
      id: 2,
      login: 'newbie',
      firstName: 'Тест',
      lastName: 'Тестов',
      screenName: null,
      createdAt: '',
    })
    const container = authTestContainer(fakeAuthGateway({ register }))
    const onSuccess = vi.fn()
    render(<RegisterForm onSuccess={onSuccess} />, { wrapper: withDi(container) })
    await fill()
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(register).toHaveBeenCalledWith({
      login: 'newbie',
      firstName: 'Тест',
      lastName: 'Тестов',
      password: 'password123',
    })
  })

  it('shows login_taken under the login field', async () => {
    const register = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('taken'), { status: 409, code: 'login_taken' }))
    const container = authTestContainer(fakeAuthGateway({ register }))
    render(<RegisterForm onSuccess={vi.fn()} />, { wrapper: withDi(container) })
    await fill()
    expect(await screen.findByText('Логин занят')).toBeInTheDocument()
  })

  it('associates the error text with the login field for assistive tech', async () => {
    const register = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('taken'), { status: 409, code: 'login_taken' }))
    const container = authTestContainer(fakeAuthGateway({ register }))
    render(<RegisterForm onSuccess={vi.fn()} />, { wrapper: withDi(container) })
    await fill()
    const msg = await screen.findByText('Логин занят')
    const input = screen.getByLabelText('Логин')
    expect(input).toHaveAttribute('aria-describedby', msg.id)
    expect(msg.id).toBeTruthy()
  })

  it('marks the invalid field with aria-invalid', async () => {
    const register = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('taken'), { status: 409, code: 'login_taken' }))
    const container = authTestContainer(fakeAuthGateway({ register }))
    render(<RegisterForm onSuccess={vi.fn()} />, { wrapper: withDi(container) })
    await fill()
    await screen.findByText('Логин занят')
    expect(screen.getByLabelText('Логин')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('aria-invalid', 'false')
  })

  it('clears the error once the user edits the field again', async () => {
    const register = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('taken'), { status: 409, code: 'login_taken' }))
    const container = authTestContainer(fakeAuthGateway({ register }))
    render(<RegisterForm onSuccess={vi.fn()} />, { wrapper: withDi(container) })
    await fill()
    expect(await screen.findByText('Логин занят')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Логин'), '2')
    expect(screen.queryByText('Логин занят')).not.toBeInTheDocument()
  })
})

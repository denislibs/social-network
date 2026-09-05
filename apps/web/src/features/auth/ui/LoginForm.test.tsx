import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const { login } = vi.hoisted(() => ({ login: vi.fn() }))
vi.mock('../api/authApi', () => ({ authApi: { login, register: vi.fn() } }))

import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  it('submits and calls onSuccess with the user', async () => {
    login.mockResolvedValue({
      id: 1,
      login: 'demo',
      firstName: 'Демо',
      lastName: 'П',
      screenName: null,
      createdAt: '',
    })
    const onSuccess = vi.fn()
    render(<LoginForm onSuccess={onSuccess} />)
    await userEvent.type(screen.getByLabelText('Логин'), 'demo')
    await userEvent.type(screen.getByLabelText('Пароль'), 'demo1234')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))
    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ login: 'demo' })),
    )
    expect(login).toHaveBeenCalledWith({ login: 'demo', password: 'demo1234' })
  })

  it('shows the error for invalid credentials', async () => {
    login.mockRejectedValue(
      Object.assign(new Error('Wrong'), { status: 401, code: 'invalid_credentials' }),
    )
    render(<LoginForm onSuccess={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Логин'), 'demo')
    await userEvent.type(screen.getByLabelText('Пароль'), 'bad')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))
    expect(await screen.findByText('Неверный логин или пароль')).toBeInTheDocument()
  })
})

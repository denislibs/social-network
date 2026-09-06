import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { withDi } from '@/shared/di'
import { authTestContainer, fakeAuthGateway } from '../model/testing'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  it('submits and calls onSuccess with the user', async () => {
    const login = vi.fn().mockResolvedValue({
      id: 1,
      login: 'demo',
      firstName: 'Демо',
      lastName: 'П',
      screenName: null,
      createdAt: '',
    })
    const container = authTestContainer(fakeAuthGateway({ login }))
    const onSuccess = vi.fn()
    render(<LoginForm onSuccess={onSuccess} />, { wrapper: withDi(container) })
    await userEvent.type(screen.getByLabelText('Логин'), 'demo')
    await userEvent.type(screen.getByLabelText('Пароль'), 'demo1234')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))
    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ login: 'demo' })),
    )
    expect(login).toHaveBeenCalledWith({ login: 'demo', password: 'demo1234' })
  })

  it('shows the error for invalid credentials', async () => {
    const login = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('Wrong'), { status: 401, code: 'invalid_credentials' }),
      )
    const container = authTestContainer(fakeAuthGateway({ login }))
    render(<LoginForm onSuccess={vi.fn()} />, { wrapper: withDi(container) })
    await userEvent.type(screen.getByLabelText('Логин'), 'demo')
    await userEvent.type(screen.getByLabelText('Пароль'), 'bad')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))
    expect(await screen.findByText('Неверный логин или пароль')).toBeInTheDocument()
  })

  it('associates the error text with the field for assistive tech', async () => {
    const login = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('bad'), { status: 422, code: 'invalid_login' }))
    const container = authTestContainer(fakeAuthGateway({ login }))
    render(<LoginForm onSuccess={vi.fn()} />, { wrapper: withDi(container) })
    await userEvent.type(screen.getByLabelText('Логин'), 'ab')
    await userEvent.type(screen.getByLabelText('Пароль'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))
    const msg = await screen.findByText('3–32 символа: латиница, цифры, _ .')
    const input = screen.getByLabelText('Логин')
    expect(input).toHaveAttribute('aria-describedby', msg.id)
    expect(msg.id).toBeTruthy()
  })

  it('marks the invalid field with aria-invalid', async () => {
    const login = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('bad'), { status: 422, code: 'invalid_login' }))
    const container = authTestContainer(fakeAuthGateway({ login }))
    render(<LoginForm onSuccess={vi.fn()} />, { wrapper: withDi(container) })
    await userEvent.type(screen.getByLabelText('Логин'), 'ab')
    await userEvent.type(screen.getByLabelText('Пароль'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))
    await screen.findByText('3–32 символа: латиница, цифры, _ .')
    expect(screen.getByLabelText('Логин')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('aria-invalid', 'false')
  })

  it('clears the error once the user edits the field again', async () => {
    const login = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('bad'), { status: 401, code: 'invalid_credentials' }),
      )
    const container = authTestContainer(fakeAuthGateway({ login }))
    render(<LoginForm onSuccess={vi.fn()} />, { wrapper: withDi(container) })
    await userEvent.type(screen.getByLabelText('Логин'), 'demo')
    await userEvent.type(screen.getByLabelText('Пароль'), 'bad')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))
    expect(await screen.findByText('Неверный логин или пароль')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Пароль'), '1')
    expect(screen.queryByText('Неверный логин или пароль')).not.toBeInTheDocument()
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const { register } = vi.hoisted(() => ({ register: vi.fn() }))
vi.mock('../api/authApi', () => ({ authApi: { login: vi.fn(), register } }))

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
    register.mockResolvedValue({
      id: 2,
      login: 'newbie',
      firstName: 'Тест',
      lastName: 'Тестов',
      screenName: null,
      createdAt: '',
    })
    const onSuccess = vi.fn()
    render(<RegisterForm onSuccess={onSuccess} />)
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
    register.mockRejectedValue(
      Object.assign(new Error('taken'), { status: 409, code: 'login_taken' }),
    )
    render(<RegisterForm onSuccess={vi.fn()} />)
    await fill()
    expect(await screen.findByText('Логин занят')).toBeInTheDocument()
  })

  it('associates the error text with the login field for assistive tech', async () => {
    register.mockRejectedValue(
      Object.assign(new Error('taken'), { status: 409, code: 'login_taken' }),
    )
    render(<RegisterForm onSuccess={vi.fn()} />)
    await fill()
    const msg = await screen.findByText('Логин занят')
    const input = screen.getByLabelText('Логин')
    expect(input).toHaveAttribute('aria-describedby', msg.id)
    expect(msg.id).toBeTruthy()
  })

  it('marks the invalid field with aria-invalid', async () => {
    register.mockRejectedValue(
      Object.assign(new Error('taken'), { status: 409, code: 'login_taken' }),
    )
    render(<RegisterForm onSuccess={vi.fn()} />)
    await fill()
    await screen.findByText('Логин занят')
    expect(screen.getByLabelText('Логин')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('aria-invalid', 'false')
  })

  it('clears the error once the user edits the field again', async () => {
    register.mockRejectedValue(
      Object.assign(new Error('taken'), { status: 409, code: 'login_taken' }),
    )
    render(<RegisterForm onSuccess={vi.fn()} />)
    await fill()
    expect(await screen.findByText('Логин занят')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Логин'), '2')
    expect(screen.queryByText('Логин занят')).not.toBeInTheDocument()
  })
})

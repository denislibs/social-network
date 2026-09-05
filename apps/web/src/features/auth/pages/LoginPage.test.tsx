import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, waitFor } from '@solidjs/testing-library'
import { describe, expect, it, vi } from 'vitest'

const login = vi.fn()
vi.mock('~/features/auth/api', () => ({
  authApi: { login: (i: unknown) => login(i), register: vi.fn() },
}))
const setUser = vi.fn()
vi.mock('~/shared/session/session', () => ({
  useSession: () => ({ setUser, user: () => null, status: () => 'guest' }),
}))

import LoginPage from './LoginPage'

function mount() {
  const history = createMemoryHistory()
  history.set({ value: '/login' })
  return {
    history,
    ...render(() => (
      <MemoryRouter history={history}>
        <Route path="/login" component={LoginPage} />
        <Route path="/feed" component={() => <div>FEED</div>} />
      </MemoryRouter>
    )),
  }
}
describe('LoginPage', () => {
  it('submits credentials, stores user and navigates to /feed', async () => {
    login.mockResolvedValue({ id: 1, login: 'demo' })
    const { getByLabelText, getByRole, getByText } = mount()
    fireEvent.input(getByLabelText('Логин'), { target: { value: 'demo' } })
    fireEvent.input(getByLabelText('Пароль'), { target: { value: 'demo1234' } })
    fireEvent.click(getByRole('button', { name: 'Войти' }))
    await waitFor(() => expect(getByText('FEED')).toBeInTheDocument())
    expect(login).toHaveBeenCalledWith({ login: 'demo', password: 'demo1234' })
    expect(setUser).toHaveBeenCalledWith({ id: 1, login: 'demo' })
  })
  it('shows error for invalid credentials', async () => {
    login.mockRejectedValue(
      Object.assign(new Error('Wrong'), { status: 401, code: 'invalid_credentials' }),
    )
    const { getByLabelText, getByRole, getByText } = mount()
    fireEvent.input(getByLabelText('Логин'), { target: { value: 'demo' } })
    fireEvent.input(getByLabelText('Пароль'), { target: { value: 'bad' } })
    fireEvent.click(getByRole('button', { name: 'Войти' }))
    await waitFor(() => expect(getByText('Неверный логин или пароль')).toBeInTheDocument())
  })
})

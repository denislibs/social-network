import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { createSessionTestProvider } from '@/entities/session'
import type { UserDto } from '@/shared/api'
import { useAuthRedirect } from './useAuthRedirect'

const user: UserDto = {
  id: 1,
  login: 'demo',
  firstName: 'Д',
  lastName: 'П',
  screenName: null,
  createdAt: '',
}

function LoginProbe() {
  const { onAuthenticated } = useAuthRedirect()
  return <button onClick={() => onAuthenticated(user)}>authenticate</button>
}

function mount(initialEntry: { pathname: string; state?: unknown }, setUser = vi.fn()) {
  const Session = createSessionTestProvider({ setUser })
  const router = createMemoryRouter(
    [
      {
        path: '/login',
        element: (
          <Session>
            <LoginProbe />
          </Session>
        ),
      },
      { path: '/im', element: <div>IM</div> },
      { path: '/feed', element: <div>FEED</div> },
    ],
    { initialEntries: [initialEntry] },
  )
  return { ...render(<RouterProvider router={router} />), setUser }
}

describe('useAuthRedirect', () => {
  it('redirects to location.state.redirect when present', async () => {
    const { setUser } = mount({ pathname: '/login', state: { redirect: '/im' } })
    await userEvent.click(screen.getByRole('button', { name: 'authenticate' }))
    expect(await screen.findByText('IM')).toBeInTheDocument()
    expect(setUser).toHaveBeenCalledWith(user)
  })

  it('redirects to /feed by default', async () => {
    const { setUser } = mount({ pathname: '/login' })
    await userEvent.click(screen.getByRole('button', { name: 'authenticate' }))
    expect(await screen.findByText('FEED')).toBeInTheDocument()
    expect(setUser).toHaveBeenCalledWith(user)
  })

  it('calls setUser before navigating', async () => {
    let userSetBeforeNavigate = false
    const setUser = vi.fn(() => {
      userSetBeforeNavigate = !screen.queryByText('FEED')
    })
    mount({ pathname: '/login' }, setUser)
    await userEvent.click(screen.getByRole('button', { name: 'authenticate' }))
    await screen.findByText('FEED')
    expect(userSetBeforeNavigate).toBe(true)
  })
})

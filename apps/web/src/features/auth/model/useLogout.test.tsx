import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { createSessionTestProvider } from '@/entities/session'
import { useLogout } from './useLogout'

function LogoutProbe() {
  const { logout: doLogout } = useLogout()
  return <button onClick={() => void doLogout()}>logout</button>
}

function mount(logout = vi.fn().mockResolvedValue(undefined)) {
  const Session = createSessionTestProvider({ logout })
  const router = createMemoryRouter(
    [
      {
        path: '/settings',
        element: (
          <Session>
            <LogoutProbe />
          </Session>
        ),
      },
      { path: '/login', element: <div>LOGIN</div> },
    ],
    { initialEntries: ['/settings'] },
  )
  return { ...render(<RouterProvider router={router} />), logout }
}

describe('useLogout', () => {
  it('logs out via session and navigates to /login', async () => {
    const { logout } = mount()
    await userEvent.click(screen.getByRole('button', { name: 'logout' }))
    expect(logout).toHaveBeenCalled()
    expect(await screen.findByText('LOGIN')).toBeInTheDocument()
  })
})

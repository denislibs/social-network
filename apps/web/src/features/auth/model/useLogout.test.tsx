import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { logout } = vi.hoisted(() => ({ logout: vi.fn() }))
vi.mock('@/entities/session', () => ({ useSession: () => ({ logout }) }))

import { useLogout } from './useLogout'

function LogoutProbe() {
  const { logout: doLogout } = useLogout()
  return <button onClick={() => void doLogout()}>logout</button>
}

function mount() {
  const router = createMemoryRouter(
    [
      { path: '/settings', element: <LogoutProbe /> },
      { path: '/login', element: <div>LOGIN</div> },
    ],
    { initialEntries: ['/settings'] },
  )
  return render(<RouterProvider router={router} />)
}

beforeEach(() => {
  logout.mockReset()
})

describe('useLogout', () => {
  it('logs out via session and navigates to /login', async () => {
    logout.mockResolvedValue(undefined)
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'logout' }))
    expect(logout).toHaveBeenCalled()
    expect(await screen.findByText('LOGIN')).toBeInTheDocument()
  })
})

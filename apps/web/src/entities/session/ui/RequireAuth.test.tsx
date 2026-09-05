import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

const { useSessionMock } = vi.hoisted(() => ({ useSessionMock: vi.fn() }))
vi.mock('../model/useSession', () => ({ useSession: useSessionMock }))

import { RequireAuth } from './RequireAuth'

function RedirectProbe() {
  const location = useLocation()
  const redirect = (location.state as { redirect?: string } | null)?.redirect
  return <div>redirect:{redirect ?? 'none'}</div>
}

function mount(initialEntry: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/protected',
        element: (
          <RequireAuth>
            <div>PROTECTED</div>
          </RequireAuth>
        ),
      },
      { path: '/login', element: <RedirectProbe /> },
    ],
    { initialEntries: [initialEntry] },
  )
  return render(<RouterProvider router={router} />)
}

describe('RequireAuth', () => {
  it('renders a spinner while loading', () => {
    useSessionMock.mockReturnValue({ status: 'loading' })
    mount('/protected')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('redirects a guest to /login with the attempted path (incl. search+hash) as state', () => {
    useSessionMock.mockReturnValue({ status: 'guest' })
    mount('/protected?tab=x#y')
    expect(screen.getByText('redirect:/protected?tab=x#y')).toBeInTheDocument()
  })

  it('renders children once authed', () => {
    useSessionMock.mockReturnValue({ status: 'authed' })
    mount('/protected')
    expect(screen.getByText('PROTECTED')).toBeInTheDocument()
  })
})

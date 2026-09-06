import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { SessionStatus } from '../model/SessionProvider'
import { sessionTestWrapper } from '../model/testing'
import { RequireAuth } from './RequireAuth'

function RedirectProbe() {
  const location = useLocation()
  const redirect = (location.state as { redirect?: string } | null)?.redirect
  return <div>redirect:{redirect ?? 'none'}</div>
}

/** Provides `SessionContext` directly instead of `vi.mock`-ing `useSession`: the sanctioned
 * seam for a hook that has no DI binding of its own (see `model/testing.tsx`). */
function mount(initialEntry: string, status: SessionStatus) {
  const Session = sessionTestWrapper({ status })
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
  return render(<RouterProvider router={router} />, {
    wrapper: ({ children }: { children: ReactNode }) => <Session>{children}</Session>,
  })
}

describe('RequireAuth', () => {
  it('renders a spinner while loading', () => {
    mount('/protected', 'loading')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('redirects a guest to /login with the attempted path (incl. search+hash) as state', () => {
    mount('/protected?tab=x#y', 'guest')
    expect(screen.getByText('redirect:/protected?tab=x#y')).toBeInTheDocument()
  })

  it('renders children once authed', () => {
    mount('/protected', 'authed')
    expect(screen.getByText('PROTECTED')).toBeInTheDocument()
  })
})

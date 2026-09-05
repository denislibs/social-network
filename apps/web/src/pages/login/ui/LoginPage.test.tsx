import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

const { setUserMock } = vi.hoisted(() => ({ setUserMock: vi.fn() }))
vi.mock('@/entities/session', () => ({ useSession: () => ({ setUser: setUserMock }) }))
vi.mock('@/features/auth', () => ({
  LoginForm: ({ onSuccess }: { onSuccess: (u: { id: number }) => void }) => (
    <button type="button" onClick={() => onSuccess({ id: 1 })}>
      submit
    </button>
  ),
}))

import { LoginPage } from './LoginPage'

function mount(initialEntry: { pathname: string; state?: unknown }) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/im', element: <div>IM</div> },
      { path: '/feed', element: <div>FEED</div> },
    ],
    { initialEntries: [initialEntry] },
  )
  return render(<RouterProvider router={router} />)
}

describe('LoginPage', () => {
  it('navigates to the redirect target from location.state on success', async () => {
    mount({ pathname: '/login', state: { redirect: '/im' } })
    await userEvent.click(screen.getByRole('button', { name: 'submit' }))
    expect(await screen.findByText('IM')).toBeInTheDocument()
  })

  it('defaults to /feed when there is no redirect state', async () => {
    mount({ pathname: '/login' })
    await userEvent.click(screen.getByRole('button', { name: 'submit' }))
    expect(await screen.findByText('FEED')).toBeInTheDocument()
  })
})

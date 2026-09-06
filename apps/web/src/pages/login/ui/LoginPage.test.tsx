import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { createSessionTestProvider } from '@/entities/session'
import type * as AuthModule from '@/features/auth'

// `LoginForm` itself is out of scope here (covered by its own test); only its
// `onSuccess` callback matters, so it's stubbed. `useAuthRedirect` is real —
// the point of this test is that the real redirect hook, wired to a session
// test provider, is what LoginPage composes.
vi.mock('@/features/auth', async (importActual) => ({
  ...(await importActual<typeof AuthModule>()),
  LoginForm: ({ onSuccess }: { onSuccess: (u: { id: number }) => void }) => (
    <button type="button" onClick={() => onSuccess({ id: 1 })}>
      submit
    </button>
  ),
}))

import { LoginPage } from './LoginPage'

function mount(setUser = vi.fn()) {
  const Session = createSessionTestProvider({ setUser })
  return {
    ...render(
      <MemoryRouter>
        <Session>
          <LoginPage />
        </Session>
      </MemoryRouter>,
    ),
    setUser,
  }
}

describe('LoginPage', () => {
  it('calls onAuthenticated from useAuthRedirect with the authenticated user on success', async () => {
    const { setUser } = mount()
    await userEvent.click(screen.getByRole('button', { name: 'submit' }))
    expect(setUser).toHaveBeenCalledWith({ id: 1 })
  })
})

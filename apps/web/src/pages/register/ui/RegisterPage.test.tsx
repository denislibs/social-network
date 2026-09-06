import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

const { onAuthenticatedMock } = vi.hoisted(() => ({ onAuthenticatedMock: vi.fn() }))
vi.mock('@/features/auth', () => ({
  RegisterForm: ({ onSuccess }: { onSuccess: (u: { id: number }) => void }) => (
    <button type="button" onClick={() => onSuccess({ id: 1 })}>
      submit
    </button>
  ),
  useAuthRedirect: () => ({ onAuthenticated: onAuthenticatedMock }),
}))

import { RegisterPage } from './RegisterPage'

describe('RegisterPage', () => {
  it('calls onAuthenticated from useAuthRedirect with the authenticated user on success', async () => {
    render(<RegisterPage />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'submit' }))
    expect(onAuthenticatedMock).toHaveBeenCalledWith({ id: 1 })
  })
})

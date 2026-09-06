import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { createSessionTestProvider } from '@/entities/session'
import type { ProfileDto, UserGateway } from '@/entities/user'
import { USER_GATEWAY } from '@/entities/user'
import { ApiError } from '@/shared/api'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { EditProfileForm } from './EditProfileForm'

function fakeUserGateway(overrides: Partial<UserGateway> = {}): UserGateway {
  return {
    getProfile: vi.fn(),
    getFriends: vi.fn(),
    getFollowers: vi.fn(),
    getRequests: vi.fn(),
    getMyCounters: vi.fn(),
    searchUsers: vi.fn(),
    updateProfile: vi.fn(),
    resolve: vi.fn(),
    ...overrides,
  }
}

const profile: ProfileDto = {
  id: 1,
  login: 'demo',
  firstName: 'Д',
  lastName: 'П',
  screenName: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  status: 'привет',
  bio: null,
  city: null,
  birthday: null,
  isVerified: false,
  counters: { friends: 0, followers: 0, communities: 0, incomingRequests: 0 },
  relation: 'self',
}

function compose(
  Outer: (props: { children: ReactNode }) => ReactNode,
  Inner: (props: { children: ReactNode }) => ReactNode,
) {
  return function Composed({ children }: { children: ReactNode }) {
    return (
      <Outer>
        <Inner>{children}</Inner>
      </Outer>
    )
  }
}

function mount(overrides: Partial<UserGateway> = {}) {
  const gateway = fakeUserGateway(overrides)
  const container = createTestContainer()
  container.bind(USER_GATEWAY).toConstantValue(gateway)
  const Session = createSessionTestProvider({
    user: { id: 1, login: 'demo', firstName: 'Д', lastName: 'П', screenName: null, createdAt: '' },
    status: 'authed',
    setUser: vi.fn(),
  })
  render(
    <MemoryRouter>
      <EditProfileForm profile={profile} />
    </MemoryRouter>,
    { wrapper: compose(withProviders(container), Session) },
  )
  return { gateway }
}

describe('EditProfileForm', () => {
  it('renders the fields pre-filled from the profile', () => {
    mount()
    expect(screen.getByLabelText('Статус')).toHaveValue('привет')
  })

  it('has no aria-invalid on the status field before submission', () => {
    mount()
    expect(screen.getByLabelText('Статус')).toHaveAttribute('aria-invalid', 'false')
  })

  it('marks the screen name field invalid and describes the error after an invalid submit', async () => {
    mount()
    const screenNameInput = screen.getByLabelText('Короткое имя')
    await userEvent.type(screenNameInput, 'a')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(
      await screen.findByText('3–32 символа: латиница, цифры, _ . ; не начинается с id/club'),
    ).toBeInTheDocument()
    expect(screenNameInput).toHaveAttribute('aria-invalid', 'true')
    expect(screenNameInput).toHaveAttribute('aria-describedby', 'edit-screen-name-error')
  })

  it('clears the field error once the user edits the field again', async () => {
    mount()
    const screenNameInput = screen.getByLabelText('Короткое имя')
    await userEvent.type(screenNameInput, 'a')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByText(/3–32 символа/)).toBeInTheDocument()

    await userEvent.type(screenNameInput, 'bc')
    expect(screen.queryByText(/3–32 символа/)).not.toBeInTheDocument()
  })

  it('routes a server screen_name_taken error onto the field after a valid submit', async () => {
    mount({ updateProfile: vi.fn().mockRejectedValue(new ApiError(409, 'screen_name_taken', 'x')) })
    const screenNameInput = screen.getByLabelText('Короткое имя')
    await userEvent.type(screenNameInput, 'newname')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Короткое имя занято')).toBeInTheDocument()
  })

  it('submits the changed status field', async () => {
    const updateProfile = vi.fn().mockResolvedValue({ ...profile, status: 'новый' })
    mount({ updateProfile })
    const statusInput = screen.getByLabelText('Статус')
    await userEvent.clear(statusInput)
    await userEvent.type(statusInput, 'новый')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(updateProfile).toHaveBeenCalledWith({ status: 'новый' })
  })
})

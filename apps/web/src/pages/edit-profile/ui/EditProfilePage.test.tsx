import { act, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSessionTestProvider } from '@/entities/session'
import type { ProfileDto, UserGateway } from '@/entities/user'
import { USER_GATEWAY } from '@/entities/user'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { EditProfilePage } from './EditProfilePage'

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
  screenName: 'demo_screen',
  createdAt: '2024-01-01T00:00:00.000Z',
  status: '',
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
  const container = createTestContainer()
  container.bind(USER_GATEWAY).toConstantValue(fakeUserGateway(overrides))
  const Session = createSessionTestProvider({
    user: {
      id: 1,
      login: 'demo',
      firstName: 'Д',
      lastName: 'П',
      screenName: 'demo_screen',
      createdAt: '',
    },
    status: 'authed',
    setUser: vi.fn(),
  })
  render(
    <MemoryRouter>
      <EditProfilePage />
    </MemoryRouter>,
    { wrapper: compose(withProviders(container), Session) },
  )
}

describe('EditProfilePage', () => {
  it('shows a skeleton while the profile is loading', async () => {
    mount({ getProfile: vi.fn((): Promise<never> => new Promise(() => {})) })
    expect(await screen.findByLabelText('Загрузка')).toHaveAttribute('aria-busy', 'true')
  })

  it('renders the edit form once the profile loads', async () => {
    mount({ getProfile: vi.fn().mockResolvedValue(profile) })
    expect(await screen.findByRole('button', { name: 'Сохранить' })).toBeInTheDocument()
  })

  it('shows a placeholder on error', async () => {
    mount({ getProfile: vi.fn().mockRejectedValue(new Error('boom')) })
    expect(await screen.findByText('Не удалось загрузить профиль')).toBeInTheDocument()
  })

  describe('while the profile is resolving', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows neither the skeleton nor the error placeholder before the 150 ms delay', () => {
      // The error/placeholder branch must wait for the query to actually settle: rendering it
      // while the request is still in flight would flash "не удалось загрузить" on every load.
      mount({ getProfile: vi.fn((): Promise<never> => new Promise(() => {})) })

      expect(screen.queryByLabelText('Загрузка')).not.toBeInTheDocument()
      expect(screen.queryByText('Не удалось загрузить профиль')).not.toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(150)
      })

      expect(screen.getByLabelText('Загрузка')).toBeInTheDocument()
      expect(screen.queryByText('Не удалось загрузить профиль')).not.toBeInTheDocument()
    })
  })
})

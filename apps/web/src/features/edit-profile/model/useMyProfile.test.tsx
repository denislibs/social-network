import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createSessionTestProvider } from '@/entities/session'
import type { ProfileDto, UserGateway } from '@/entities/user'
import { USER_GATEWAY } from '@/entities/user'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { useMyProfile } from './useMyProfile'

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

describe('useMyProfile', () => {
  it('exposes both the raw isPending and the delayed showSkeleton flag', async () => {
    const getProfile = vi.fn().mockResolvedValue({ id: 1 } as ProfileDto)
    const container = createTestContainer()
    container.bind(USER_GATEWAY).toConstantValue(fakeUserGateway({ getProfile }))
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
    })
    const { result } = renderHook(() => useMyProfile(), {
      wrapper: compose(withProviders(container), Session),
    })

    expect(result.current.isPending).toBe(true)
    expect(result.current.showSkeleton).toBe(false)

    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.showSkeleton).toBe(false)
  })

  it('loads the profile for the signed-in user by their own handle', async () => {
    const profile = { id: 1 } as ProfileDto
    const getProfile = vi.fn().mockResolvedValue(profile)
    const container = createTestContainer()
    container.bind(USER_GATEWAY).toConstantValue(fakeUserGateway({ getProfile }))
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
    })
    const { result } = renderHook(() => useMyProfile(), {
      wrapper: compose(withProviders(container), Session),
    })

    await waitFor(() => expect(result.current.profile).toEqual(profile))
    expect(getProfile).toHaveBeenCalledWith('demo_screen')
  })

  it('falls back to the id-based handle when there is no screen name', async () => {
    const getProfile = vi.fn().mockResolvedValue({ id: 7 } as ProfileDto)
    const container = createTestContainer()
    container.bind(USER_GATEWAY).toConstantValue(fakeUserGateway({ getProfile }))
    const Session = createSessionTestProvider({
      user: {
        id: 7,
        login: 'demo',
        firstName: 'Д',
        lastName: 'П',
        screenName: null,
        createdAt: '',
      },
      status: 'authed',
    })
    renderHook(() => useMyProfile(), { wrapper: compose(withProviders(container), Session) })

    await waitFor(() => expect(getProfile).toHaveBeenCalledWith('id7'))
  })

  it('does not query when there is no signed-in user', () => {
    const getProfile = vi.fn()
    const container = createTestContainer()
    container.bind(USER_GATEWAY).toConstantValue(fakeUserGateway({ getProfile }))
    const Session = createSessionTestProvider({ user: null, status: 'guest' })
    renderHook(() => useMyProfile(), { wrapper: compose(withProviders(container), Session) })

    expect(getProfile).not.toHaveBeenCalled()
  })
})

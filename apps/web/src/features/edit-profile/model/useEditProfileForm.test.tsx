import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import type * as ReactRouter from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { createSessionTestProvider } from '@/entities/session'
import type { ProfileDto, UserGateway } from '@/entities/user'
import { USER_GATEWAY } from '@/entities/user'
import { ApiError } from '@/shared/api'
import { createTestContainer } from '@/shared/di'
import { queryKeys, withProviders } from '@/shared/lib'
import { useEditProfileForm } from './useEditProfileForm'

const navigateSpy = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()
  return { ...actual, useNavigate: () => navigateSpy }
})

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
  status: 'старый статус',
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

function setup(gateway: Partial<UserGateway>, setUser = vi.fn()) {
  const container = createTestContainer()
  container.bind(USER_GATEWAY).toConstantValue(fakeUserGateway(gateway))
  const Session = createSessionTestProvider({
    user: { id: 1, login: 'demo', firstName: 'Д', lastName: 'П', screenName: null, createdAt: '' },
    status: 'authed',
    setUser,
  })
  const hook = renderHook(() => useEditProfileForm(profile), {
    wrapper: compose(withProviders(container), Session),
  })
  return { ...hook, gateway: container.get(USER_GATEWAY), setUser }
}

describe('useEditProfileForm', () => {
  it('initializes values from the profile', () => {
    const { result } = setup({})
    expect(result.current.values).toEqual({
      status: 'старый статус',
      bio: '',
      city: '',
      birthday: '',
      screenName: '',
    })
  })

  it('sends only the fields that changed', async () => {
    const { result, gateway } = setup({
      updateProfile: vi.fn().mockResolvedValue({ ...profile, status: 'новый статус' }),
    })
    act(() => result.current.setField('status', 'новый статус'))
    await act(() => result.current.submit())

    expect(gateway.updateProfile).toHaveBeenCalledWith({ status: 'новый статус' })
  })

  it('does not call the gateway when nothing changed', async () => {
    const { result, gateway } = setup({})
    await act(() => result.current.submit())
    expect(gateway.updateProfile).not.toHaveBeenCalled()
  })

  it('sends null for a field cleared back to empty', async () => {
    const { result, gateway } = setup({
      updateProfile: vi.fn().mockResolvedValue({ ...profile, status: null }),
    })
    act(() => result.current.setField('status', ''))
    await act(() => result.current.submit())
    expect(gateway.updateProfile).toHaveBeenCalledWith({ status: null })
  })

  it('rejects an invalid screen name client-side without calling the gateway', async () => {
    const { result, gateway } = setup({})
    act(() => result.current.setField('screenName', 'a'))
    await act(() => result.current.submit())

    expect(gateway.updateProfile).not.toHaveBeenCalled()
    expect(result.current.errors.screenName).toBe(
      '3–32 символа: латиница, цифры, _ . ; не начинается с id/club',
    )
  })

  it('rejects a status over 140 characters client-side', async () => {
    const { result, gateway } = setup({})
    act(() => result.current.setField('status', 'x'.repeat(141)))
    await act(() => result.current.submit())

    expect(gateway.updateProfile).not.toHaveBeenCalled()
    expect(result.current.errors.status).toBe('Не длиннее 140 символов')
  })

  it('accepts a mixed-case screen name and sends it lower-cased to the gateway', async () => {
    const { result, gateway } = setup({
      updateProfile: vi.fn().mockResolvedValue({ ...profile, screenName: 'newclub' }),
    })
    act(() => result.current.setField('screenName', 'NewClub'))
    await act(() => result.current.submit())

    expect(result.current.errors.screenName).toBeUndefined()
    expect(gateway.updateProfile).toHaveBeenCalledWith({ screenName: 'newclub' })
  })

  it('routes a screen_name_taken server error to the screenName field', async () => {
    const { result } = setup({
      updateProfile: vi.fn().mockRejectedValue(new ApiError(409, 'screen_name_taken', 'x')),
    })
    act(() => result.current.setField('screenName', 'newname'))
    await act(() => result.current.submit())

    expect(result.current.errors.screenName).toBe('Короткое имя занято')
  })

  it('on success, calls setUser with the updated identity fields and navigates to the new handle', async () => {
    const updated = { ...profile, screenName: 'newname' }
    const setUser = vi.fn()
    const { result } = setup({ updateProfile: vi.fn().mockResolvedValue(updated) }, setUser)
    act(() => result.current.setField('screenName', 'newname'))
    await act(() => result.current.submit())

    expect(setUser).toHaveBeenCalledWith({
      id: updated.id,
      login: updated.login,
      firstName: updated.firstName,
      lastName: updated.lastName,
      screenName: updated.screenName,
      createdAt: updated.createdAt,
    })
    expect(navigateSpy).toHaveBeenCalledWith('/newname')
  })

  it('falls back to the previous session login when the response omits it', async () => {
    // `ProfileDto.login` only comes back for `relation === 'self'` and is typed optional;
    // a response that omits it must not blank out the login already held in the session.
    const updated = { ...profile, login: undefined, screenName: 'newname' }
    const setUser = vi.fn()
    const { result } = setup({ updateProfile: vi.fn().mockResolvedValue(updated) }, setUser)
    act(() => result.current.setField('screenName', 'newname'))
    await act(() => result.current.submit())

    expect(setUser).toHaveBeenCalledWith(
      expect.objectContaining({ login: 'demo' /* the session user's login, from setup() */ }),
    )
  })

  it('never calls setUser with a blank login when there is no session user to fall back to', async () => {
    // Defensive only: this page requires an authed session, so `user` is never actually
    // null here. But the fallback chain must not paper over that with an empty string.
    const updated = { ...profile, login: undefined, screenName: 'newname' }
    const setUser = vi.fn()
    const container = createTestContainer()
    container
      .bind(USER_GATEWAY)
      .toConstantValue(fakeUserGateway({ updateProfile: vi.fn().mockResolvedValue(updated) }))
    const Session = createSessionTestProvider({ user: null, status: 'authed', setUser })
    const { result } = renderHook(() => useEditProfileForm(profile), {
      wrapper: compose(withProviders(container), Session),
    })
    act(() => result.current.setField('screenName', 'newname'))
    await act(() => result.current.submit())

    expect(setUser).not.toHaveBeenCalled()
  })

  it('busy is true while the request is in flight', async () => {
    let resolve!: (p: ProfileDto) => void
    const { result } = setup({
      updateProfile: vi.fn(() => new Promise<ProfileDto>((r) => (resolve = r))),
    })
    act(() => result.current.setField('status', 'x'))
    let p!: Promise<void>
    act(() => {
      p = result.current.submit()
    })
    expect(result.current.busy).toBe(true)
    await act(async () => {
      resolve({ ...profile, status: 'x' })
      await p
    })
    expect(result.current.busy).toBe(false)
  })
})

describe('useEditProfileForm cache invalidation', () => {
  it('invalidates user and handle query keys on success', async () => {
    const { QueryClient } = await import('@tanstack/react-query')
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(queryKeys.user.profile('newname'), { fake: true })
    client.setQueryData(queryKeys.user.handle('newname'), { fake: true })

    const container = createTestContainer()
    container.bind(USER_GATEWAY).toConstantValue(
      fakeUserGateway({
        updateProfile: vi.fn().mockResolvedValue({ ...profile, screenName: 'newname' }),
      }),
    )
    const Session = createSessionTestProvider({
      user: {
        id: 1,
        login: 'demo',
        firstName: 'Д',
        lastName: 'П',
        screenName: null,
        createdAt: '',
      },
      status: 'authed',
      setUser: vi.fn(),
    })
    const { result } = renderHook(() => useEditProfileForm(profile), {
      wrapper: compose(withProviders(container, client), Session),
    })

    const spy = vi.spyOn(client, 'invalidateQueries')
    act(() => result.current.setField('screenName', 'newname'))
    await act(() => result.current.submit())

    await waitFor(() => expect(spy).toHaveBeenCalled())
    const predicateCalls = spy.mock.calls.filter((c) => 'predicate' in c[0]!)
    expect(predicateCalls.length).toBeGreaterThanOrEqual(2)
  })
})

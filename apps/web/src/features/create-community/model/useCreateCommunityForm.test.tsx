import { QueryClient } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type * as ReactRouter from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { CommunityDto, CommunityGateway } from '@/entities/community'
import { COMMUNITY_GATEWAY } from '@/entities/community'
import { ApiError } from '@/shared/api'
import { createTestContainer } from '@/shared/di'
import { queryKeys, withProviders } from '@/shared/lib'
import { useCreateCommunityForm } from './useCreateCommunityForm'

const navigateSpy = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()
  return { ...actual, useNavigate: () => navigateSpy }
})

function fakeCommunityGateway(overrides: Partial<CommunityGateway> = {}): CommunityGateway {
  return {
    get: vi.fn(),
    members: vi.fn(),
    mine: vi.fn(),
    search: vi.fn(),
    create: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    follow: vi.fn(),
    unfollow: vi.fn(),
    ...overrides,
  }
}

const created: CommunityDto = {
  id: 1,
  screenName: 'newclub',
  name: 'Новый клуб',
  description: null,
  topic: 'games',
  isVerified: false,
  membersCount: 1,
  membership: 'admin',
  isFollowing: true,
}

function setup(gateway: Partial<CommunityGateway>, onCreated = vi.fn()) {
  const container = createTestContainer()
  container.bind(COMMUNITY_GATEWAY).toConstantValue(fakeCommunityGateway(gateway))
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const hook = renderHook(() => useCreateCommunityForm(onCreated), {
    wrapper: withProviders(container, queryClient),
  })
  return { ...hook, onCreated, queryClient, gateway: container.get(COMMUNITY_GATEWAY) }
}

describe('useCreateCommunityForm', () => {
  it('rejects a too-short name client-side', async () => {
    const { result, gateway } = setup({})
    act(() => result.current.setField('name', 'A'))
    act(() => result.current.setField('screenName', 'newclub'))
    await act(() => result.current.submit())

    expect(gateway.create).not.toHaveBeenCalled()
    expect(result.current.errors.name).toBe('От 2 до 120 символов')
  })

  it('rejects an invalid screen name client-side', async () => {
    const { result, gateway } = setup({})
    act(() => result.current.setField('name', 'Клуб любителей'))
    act(() => result.current.setField('screenName', '1'))
    await act(() => result.current.submit())

    expect(gateway.create).not.toHaveBeenCalled()
    expect(result.current.errors.screenName).toBe(
      '3–32 символа: латиница, цифры, _ . ; не начинается с id/club',
    )
  })

  it('accepts a mixed-case screen name and sends it lower-cased to the gateway', async () => {
    const create = vi.fn().mockResolvedValue(created)
    const { result } = setup({ create })
    act(() => result.current.setField('name', 'Клуб'))
    act(() => result.current.setField('screenName', 'NewClub'))
    await act(() => result.current.submit())

    expect(result.current.errors.screenName).toBeUndefined()
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ screenName: 'newclub' }))
  })

  it('on success, calls the gateway with the trimmed input, invalidates communities.mine, calls onCreated and navigates', async () => {
    const create = vi.fn().mockResolvedValue(created)
    const { result, onCreated, queryClient } = setup({ create })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    act(() => result.current.setField('name', '  Новый клуб  '))
    act(() => result.current.setField('screenName', '  newclub  '))
    act(() => result.current.setField('topic', 'games'))
    act(() => result.current.setField('description', '  описание  '))
    await act(() => result.current.submit())

    expect(create).toHaveBeenCalledWith({
      name: 'Новый клуб',
      screenName: 'newclub',
      topic: 'games',
      description: 'описание',
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.community.mine })
    expect(onCreated).toHaveBeenCalledWith(created)
    expect(navigateSpy).toHaveBeenCalledWith('/newclub')
  })

  it('sends null description when left empty', async () => {
    const create = vi.fn().mockResolvedValue(created)
    const { result } = setup({ create })
    act(() => result.current.setField('name', 'Клуб'))
    act(() => result.current.setField('screenName', 'newclub'))
    await act(() => result.current.submit())

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ description: null }))
  })

  it('routes a server screen_name_taken error to the screenName field', async () => {
    const { result } = setup({
      create: vi.fn().mockRejectedValue(new ApiError(409, 'screen_name_taken', 'x')),
    })
    act(() => result.current.setField('name', 'Клуб'))
    act(() => result.current.setField('screenName', 'newclub'))
    await act(() => result.current.submit())

    expect(result.current.errors.screenName).toBe('Короткое имя занято')
  })

  it('busy is true while the request is in flight', async () => {
    let resolve!: (c: CommunityDto) => void
    const { result } = setup({
      create: vi.fn(() => new Promise<CommunityDto>((r) => (resolve = r))),
    })
    act(() => result.current.setField('name', 'Клуб'))
    act(() => result.current.setField('screenName', 'newclub'))
    let p!: Promise<void>
    act(() => {
      p = result.current.submit()
    })
    expect(result.current.busy).toBe(true)
    await act(async () => {
      resolve(created)
      await p
    })
    expect(result.current.busy).toBe(false)
  })
})

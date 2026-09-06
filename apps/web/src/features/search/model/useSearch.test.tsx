import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { withProviders } from '@/shared/lib'
import { fakeCommunityGateway, fakeUserGateway, searchTestContainer } from './testing'
import { useSearch } from './useSearch'

describe('useSearch', () => {
  it('does not query while the trimmed value is under 2 characters', () => {
    const userGateway = fakeUserGateway()
    const communityGateway = fakeCommunityGateway()
    const container = searchTestContainer(userGateway, communityGateway)
    const { result } = renderHook(() => useSearch('a', 'all'), {
      wrapper: withProviders(container),
    })

    expect(result.current.enabled).toBe(false)
    expect(userGateway.searchUsers).not.toHaveBeenCalled()
    expect(communityGateway.search).not.toHaveBeenCalled()
  })

  it('does not query for whitespace-only input', () => {
    const userGateway = fakeUserGateway()
    const communityGateway = fakeCommunityGateway()
    const container = searchTestContainer(userGateway, communityGateway)
    const { result } = renderHook(() => useSearch('  ', 'all'), {
      wrapper: withProviders(container),
    })

    expect(result.current.enabled).toBe(false)
  })

  it('collapses rapid updates into a single query for the final value', async () => {
    const userGateway = fakeUserGateway()
    const communityGateway = fakeCommunityGateway()
    const container = searchTestContainer(userGateway, communityGateway)
    const { rerender } = renderHook(({ q }: { q: string }) => useSearch(q, 'all'), {
      wrapper: withProviders(container),
      initialProps: { q: '' },
    })

    act(() => {
      rerender({ q: 'де' })
      rerender({ q: 'ден' })
    })

    await waitFor(() => expect(userGateway.searchUsers).toHaveBeenCalledWith('ден'))
    expect(userGateway.searchUsers).not.toHaveBeenCalledWith('д')
    expect(userGateway.searchUsers).not.toHaveBeenCalledWith('де')
  })

  it('kind "users" only calls searchUsers', async () => {
    const userGateway = fakeUserGateway({ searchUsers: vi.fn().mockResolvedValue([{ id: 1 }]) })
    const communityGateway = fakeCommunityGateway()
    const container = searchTestContainer(userGateway, communityGateway)
    const { result } = renderHook(() => useSearch('денис', 'users'), {
      wrapper: withProviders(container),
    })

    await waitFor(() => expect(result.current.users).toEqual([{ id: 1 }]))
    expect(communityGateway.search).not.toHaveBeenCalled()
    expect(result.current.communities).toEqual([])
  })

  it('kind "communities" only calls search', async () => {
    const userGateway = fakeUserGateway()
    const communityGateway = fakeCommunityGateway({
      search: vi.fn().mockResolvedValue([{ id: 2 }]),
    })
    const container = searchTestContainer(userGateway, communityGateway)
    const { result } = renderHook(() => useSearch('денис', 'communities'), {
      wrapper: withProviders(container),
    })

    await waitFor(() => expect(result.current.communities).toEqual([{ id: 2 }]))
    expect(userGateway.searchUsers).not.toHaveBeenCalled()
    expect(result.current.users).toEqual([])
  })

  it('kind "all" calls both gateways in parallel', async () => {
    const userGateway = fakeUserGateway({ searchUsers: vi.fn().mockResolvedValue([{ id: 1 }]) })
    const communityGateway = fakeCommunityGateway({
      search: vi.fn().mockResolvedValue([{ id: 2 }]),
    })
    const container = searchTestContainer(userGateway, communityGateway)
    const { result } = renderHook(() => useSearch('денис', 'all'), {
      wrapper: withProviders(container),
    })

    await waitFor(() => expect(result.current.users).toEqual([{ id: 1 }]))
    expect(result.current.communities).toEqual([{ id: 2 }])
  })
})

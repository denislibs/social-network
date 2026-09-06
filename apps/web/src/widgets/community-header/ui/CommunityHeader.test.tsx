import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

/**
 * What lives *inside* the «Вы участник»/«Ещё» dropdowns is covered by
 * `../model/useCommunityMenu.test.tsx`: VKUI's floating layer never settles under jsdom (its
 * position loop starves the timers RTL's async queries wait on), so opening a `Popover` here
 * would hang. These tests assert the closed row — which controls the header offers at all — and
 * the menu's contents are asserted on the hook that produces them.
 */
import type { CommunityDto, CommunityGateway } from '@/entities/community'
import { COMMUNITY_GATEWAY } from '@/entities/community'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { CommunityHeader } from './CommunityHeader'

function makeCommunity(overrides: Partial<CommunityDto> = {}): CommunityDto {
  return {
    id: 9,
    screenName: 'games',
    name: 'Игровой клуб',
    description: null,
    topic: 'games',
    isVerified: false,
    membersCount: 120,
    membership: 'none',
    isFollowing: false,
    ...overrides,
  }
}

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

function mount(
  community: CommunityDto,
  handle = 'games',
  overrides: Partial<CommunityGateway> = {},
) {
  const container = createTestContainer()
  const gateway = fakeCommunityGateway({
    get: vi.fn().mockResolvedValue(community),
    ...overrides,
  })
  container.bind(COMMUNITY_GATEWAY).toConstantValue(gateway)
  render(<CommunityHeader handle={handle} />, { wrapper: withProviders(container) })
  return { gateway }
}

describe('CommunityHeader', () => {
  it('shows a skeleton with aria-busy while pending', async () => {
    const container = createTestContainer()
    container
      .bind(COMMUNITY_GATEWAY)
      .toConstantValue(
        fakeCommunityGateway({ get: vi.fn((): Promise<never> => new Promise(() => {})) }),
      )
    render(<CommunityHeader handle="games" />, { wrapper: withProviders(container) })
    expect(await screen.findByLabelText('Загрузка')).toHaveAttribute('aria-busy', 'true')
  })

  it('renders the name, topic and members count', async () => {
    mount(makeCommunity())
    expect(await screen.findByText('Игровой клуб')).toBeInTheDocument()
    expect(screen.getByText('Игры · 120 участников')).toBeInTheDocument()
  })

  it('renders a full-width cover with the avatar overlapping it, like the profile header', async () => {
    mount(makeCommunity())
    expect(await screen.findByTestId('community-cover')).toBeInTheDocument()
    expect(screen.getByTestId('community-avatar')).toBeInTheDocument()
  })

  it('shows an "Ещё" dropdown next to the membership actions for a non-member', async () => {
    mount(makeCommunity())
    expect(await screen.findByRole('button', { name: /Ещё/ })).toBeInTheDocument()
  })

  it('shows "Вступить" when not a member', async () => {
    mount(makeCommunity({ membership: 'none' }))
    expect(await screen.findByRole('button', { name: 'Вступить' })).toBeInTheDocument()
  })

  it('a member sees one "Вы участник" control and nothing else', async () => {
    mount(makeCommunity({ membership: 'member', isFollowing: true }))

    expect(await screen.findByRole('button', { name: /Вы участник/ })).toBeInTheDocument()
    // vk.ru shows no separate «Выйти»/«Подписаться»/«Ещё» buttons for a member — one dropdown.
    expect(screen.queryByRole('button', { name: 'Выйти из сообщества' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Вступить' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ещё/ })).not.toBeInTheDocument()
  })

  it('shows "Подписаться" next to "Вступить" for a non-member', async () => {
    mount(makeCommunity({ membership: 'none', isFollowing: false }))
    expect(await screen.findByRole('button', { name: 'Вступить' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Подписаться' })).toBeInTheDocument()
  })

  it('joining updates the header even when the page was opened under the numeric /club<id> handle', async () => {
    // The community was fetched under `club7`, but `useJoinCommunity` only knows the DTO's own
    // screen name (`kino`). Before the predicate-based cache update the two keys never met and
    // the button stayed on «Вступить» until a reload.
    let current = makeCommunity({ id: 7, screenName: 'kino', membership: 'none' })
    mount(current, 'club7', {
      get: vi.fn(() => Promise.resolve(current)),
      join: vi.fn(() => {
        current = { ...current, membership: 'member', isFollowing: true }
        return Promise.resolve({ membership: 'member' as const, isFollowing: true })
      }),
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Вступить' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Вы участник' })).toBeInTheDocument(),
    )
  })
})

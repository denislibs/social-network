import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { CommunityGateway } from '@/entities/community'
import { COMMUNITY_GATEWAY } from '@/entities/community'
import type { UserCellDto } from '@/entities/user'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { CommunityMembers } from './CommunityMembers'

function user(id: number): UserCellDto {
  return {
    id,
    firstName: `Участник${id}`,
    lastName: 'Тестов',
    screenName: null,
    city: null,
    isVerified: false,
    lastSeenAt: null,
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

function mount(members: CommunityGateway['members']) {
  const container = createTestContainer()
  container.bind(COMMUNITY_GATEWAY).toConstantValue(fakeCommunityGateway({ members }))
  render(
    <MemoryRouter>
      <CommunityMembers id={9} />
    </MemoryRouter>,
    { wrapper: withProviders(container) },
  )
}

describe('CommunityMembers', () => {
  it('shows an empty placeholder when there are none', async () => {
    mount(vi.fn().mockResolvedValue({ items: [], nextCursor: null }))
    expect(await screen.findByText('Пока нет участников')).toBeInTheDocument()
  })

  it('loads the next page on "Показать ещё"', async () => {
    const members = vi
      .fn()
      .mockResolvedValueOnce({ items: [user(1)], nextCursor: 'c2' })
      .mockResolvedValueOnce({ items: [user(2)], nextCursor: null })
    mount(members)

    expect(await screen.findByText('Участник1 Тестов')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Показать ещё' }))

    await waitFor(() => expect(screen.getByText('Участник2 Тестов')).toBeInTheDocument())
    expect(members).toHaveBeenLastCalledWith(9, 'c2')
  })
})

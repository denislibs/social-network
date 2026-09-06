import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { CommunityCellDto, CommunityGateway } from '@/entities/community'
import { COMMUNITY_GATEWAY } from '@/entities/community'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { CommunitiesList } from './CommunitiesList'

function community(id: number, name: string): CommunityCellDto {
  return { id, screenName: `c${id}`, name, topic: 'games', isVerified: false, membersCount: 10 }
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

function mount(mine: CommunityGateway['mine']) {
  const container = createTestContainer()
  container.bind(COMMUNITY_GATEWAY).toConstantValue(fakeCommunityGateway({ mine }))
  render(
    <MemoryRouter>
      <CommunitiesList />
    </MemoryRouter>,
    { wrapper: withProviders(container) },
  )
}

describe('CommunitiesList', () => {
  it('shows a skeleton with aria-busy while pending', async () => {
    mount(vi.fn((): Promise<never> => new Promise(() => {})))
    expect(await screen.findByLabelText('Загрузка')).toHaveAttribute('aria-busy', 'true')
  })

  it('renders the joined communities', async () => {
    mount(vi.fn().mockResolvedValue([community(1, 'Клуб А'), community(2, 'Клуб Б')]))
    expect(await screen.findByText('Клуб А')).toBeInTheDocument()
    expect(screen.getByText('Клуб Б')).toBeInTheDocument()
  })

  it('shows an empty placeholder when there are none', async () => {
    mount(vi.fn().mockResolvedValue([]))
    expect(await screen.findByText('Пока нет сообществ')).toBeInTheDocument()
  })
})

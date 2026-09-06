import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { CommunityGateway } from '@/entities/community'
import { COMMUNITY_GATEWAY } from '@/entities/community'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { CommunitiesPage } from './CommunitiesPage'

function fakeCommunityGateway(overrides: Partial<CommunityGateway> = {}): CommunityGateway {
  return {
    get: vi.fn(),
    members: vi.fn(),
    mine: vi.fn().mockResolvedValue([]),
    search: vi.fn(),
    create: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    follow: vi.fn(),
    unfollow: vi.fn(),
    ...overrides,
  }
}

describe('CommunitiesPage', () => {
  it('shows a "Мои" tab and the joined-communities list', async () => {
    const container = createTestContainer()
    container.bind(COMMUNITY_GATEWAY).toConstantValue(fakeCommunityGateway())
    render(
      <MemoryRouter>
        <CommunitiesPage />
      </MemoryRouter>,
      { wrapper: withProviders(container) },
    )
    expect(screen.getByRole('tab', { name: 'Мои', selected: true })).toBeInTheDocument()
    expect(await screen.findByText('Пока нет сообществ')).toBeInTheDocument()
  })
})

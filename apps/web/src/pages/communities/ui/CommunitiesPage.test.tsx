import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoot, ConfigProvider } from '@vkontakte/vkui'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { CommunityGateway } from '@/entities/community'
import { COMMUNITY_GATEWAY } from '@/entities/community'
import type { UserGateway } from '@/entities/user'
import { USER_GATEWAY } from '@/entities/user'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { CommunitiesPage } from './CommunitiesPage'

function fakeCommunityGateway(overrides: Partial<CommunityGateway> = {}): CommunityGateway {
  return {
    get: vi.fn(),
    members: vi.fn(),
    mine: vi.fn().mockResolvedValue([]),
    search: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    follow: vi.fn(),
    unfollow: vi.fn(),
    ...overrides,
  }
}

function fakeUserGateway(overrides: Partial<UserGateway> = {}): UserGateway {
  return {
    getProfile: vi.fn(),
    getFriends: vi.fn(),
    getFollowers: vi.fn(),
    getRequests: vi.fn(),
    getMyCounters: vi.fn(),
    searchUsers: vi.fn().mockResolvedValue([]),
    updateProfile: vi.fn(),
    resolve: vi.fn(),
    ...overrides,
  }
}

function mount(overrides: Partial<CommunityGateway> = {}) {
  const container = createTestContainer()
  container.bind(COMMUNITY_GATEWAY).toConstantValue(fakeCommunityGateway(overrides))
  container.bind(USER_GATEWAY).toConstantValue(fakeUserGateway())
  const Providers = withProviders(container)
  render(
    <ConfigProvider>
      <AppRoot>
        <MemoryRouter>
          <Providers>
            <CommunitiesPage />
          </Providers>
        </MemoryRouter>
      </AppRoot>
    </ConfigProvider>,
  )
}

describe('CommunitiesPage', () => {
  it('shows a "Мои" tab and the joined-communities list', async () => {
    mount()
    expect(screen.getByRole('tab', { name: 'Мои', selected: true })).toBeInTheDocument()
    expect(await screen.findByText('Пока нет сообществ')).toBeInTheDocument()
  })

  it('switching to "Поиск" shows a search box and community results', async () => {
    mount({
      search: vi.fn().mockResolvedValue([
        {
          id: 1,
          screenName: 'club',
          name: 'Клуб',
          topic: 'games',
          isVerified: false,
          membersCount: 1,
        },
      ]),
    })
    await userEvent.click(screen.getByRole('tab', { name: 'Поиск' }))
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByText('Введите минимум 2 символа')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox'), 'клуб')
    expect(await screen.findByText('Клуб')).toBeInTheDocument()
  })

  it('clicking "Создать сообщество" opens the create-community modal', async () => {
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'Создать сообщество' }))
    expect(await screen.findByText('Новое сообщество')).toBeInTheDocument()
  })
})

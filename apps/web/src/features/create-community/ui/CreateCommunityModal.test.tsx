import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoot, ConfigProvider } from '@vkontakte/vkui'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { CommunityDto, CommunityGateway } from '@/entities/community'
import { COMMUNITY_GATEWAY } from '@/entities/community'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { CreateCommunityModal } from './CreateCommunityModal'

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

function mount(overrides: Partial<CommunityGateway> = {}, onClose = vi.fn(), onCreated = vi.fn()) {
  const container = createTestContainer()
  container.bind(COMMUNITY_GATEWAY).toConstantValue(fakeCommunityGateway(overrides))
  const Providers = withProviders(container)
  render(
    <ConfigProvider>
      <AppRoot>
        <MemoryRouter>
          <Providers>
            <CreateCommunityModal open onClose={onClose} onCreated={onCreated} />
          </Providers>
        </MemoryRouter>
      </AppRoot>
    </ConfigProvider>,
  )
  return { onClose, onCreated }
}

describe('CreateCommunityModal', () => {
  it('shows the "Новое сообщество" header when open', () => {
    mount()
    expect(screen.getByText('Новое сообщество')).toBeInTheDocument()
  })

  it('shows a validation error for a too-short name', async () => {
    mount()
    await userEvent.type(screen.getByLabelText('Короткое имя'), 'newclub')
    await userEvent.click(screen.getByRole('button', { name: 'Создать' }))

    expect(await screen.findByText('От 2 до 120 символов')).toBeInTheDocument()
  })

  it('on success, calls onCreated then onClose', async () => {
    const created: CommunityDto = {
      id: 1,
      screenName: 'newclub',
      name: 'Клуб',
      description: null,
      topic: 'games',
      isVerified: false,
      membersCount: 1,
      membership: 'admin',
      isFollowing: true,
    }
    const { onClose, onCreated } = mount({ create: vi.fn().mockResolvedValue(created) })

    await userEvent.type(screen.getByLabelText('Название'), 'Клуб')
    await userEvent.type(screen.getByLabelText('Короткое имя'), 'newclub')
    await userEvent.click(screen.getByRole('button', { name: 'Создать' }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created))
    expect(onClose).toHaveBeenCalled()
  })
})

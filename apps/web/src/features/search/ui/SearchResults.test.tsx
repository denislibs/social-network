import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { withProviders } from '@/shared/lib'
import { fakeCommunityGateway, fakeUserGateway, searchTestContainer } from '../model/testing'
import { SearchResults } from './SearchResults'

function mount(
  q: string,
  kind: 'all' | 'users' | 'communities',
  overrides: Parameters<typeof fakeUserGateway>[0] = {},
  communityOverrides: Parameters<typeof fakeCommunityGateway>[0] = {},
) {
  const userGateway = fakeUserGateway(overrides)
  const communityGateway = fakeCommunityGateway(communityOverrides)
  const container = searchTestContainer(userGateway, communityGateway)
  render(
    <MemoryRouter>
      <SearchResults q={q} kind={kind} />
    </MemoryRouter>,
    { wrapper: withProviders(container) },
  )
  return { userGateway, communityGateway }
}

describe('SearchResults', () => {
  it('shows a hint when the query is under 2 characters', () => {
    mount('a', 'all')
    expect(screen.getByText('Введите минимум 2 символа')).toBeInTheDocument()
  })

  it('shows a skeleton with aria-busy while pending', async () => {
    mount('денис', 'all', {
      searchUsers: vi.fn((): Promise<never> => new Promise(() => {})),
    })
    expect(await screen.findByLabelText('Загрузка')).toHaveAttribute('aria-busy', 'true')
  })

  it('shows "Ничего не найдено" when both lists come back empty', async () => {
    mount('денис', 'all')
    expect(await screen.findByText('Ничего не найдено')).toBeInTheDocument()
  })

  it('renders both groups for kind "all"', async () => {
    mount(
      'денис',
      'all',
      {
        searchUsers: vi.fn().mockResolvedValue([
          {
            id: 1,
            firstName: 'Д',
            lastName: 'П',
            screenName: null,
            city: null,
            isVerified: false,
            lastSeenAt: null,
          },
        ]),
      },
      {
        search: vi.fn().mockResolvedValue([
          {
            id: 2,
            screenName: 'club',
            name: 'Клуб',
            topic: 'games',
            isVerified: false,
            membersCount: 1,
          },
        ]),
      },
    )

    expect(await screen.findByText('Люди')).toBeInTheDocument()
    expect(screen.getByText('Сообщества')).toBeInTheDocument()
    expect(screen.getByText('Д П')).toBeInTheDocument()
    expect(screen.getByText('Клуб')).toBeInTheDocument()
  })

  it('kind "users" shows only the "Люди" group', async () => {
    mount('денис', 'users', {
      searchUsers: vi.fn().mockResolvedValue([
        {
          id: 1,
          firstName: 'Д',
          lastName: 'П',
          screenName: null,
          city: null,
          isVerified: false,
          lastSeenAt: null,
        },
      ]),
    })

    expect(await screen.findByText('Люди')).toBeInTheDocument()
    expect(screen.queryByText('Сообщества')).not.toBeInTheDocument()
  })
})

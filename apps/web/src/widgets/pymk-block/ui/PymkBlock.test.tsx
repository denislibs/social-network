import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { SuggestionDto } from '@/entities/user'
import { FRIENDSHIP_GATEWAY, type FriendshipGateway } from '@/features/friendship'
import { SUGGESTIONS_GATEWAY, type SuggestionsGateway } from '@/features/suggestions'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { PymkBlock } from './PymkBlock'

function suggestion(id: number): SuggestionDto {
  return {
    id,
    firstName: `Чел${id}`,
    lastName: 'Тестов',
    screenName: null,
    city: null,
    isVerified: false,
    lastSeenAt: null,
    mutual: 1,
    sameCity: false,
  }
}

function fakeSuggestionsGateway(overrides: Partial<SuggestionsGateway> = {}): SuggestionsGateway {
  return { list: vi.fn().mockResolvedValue([]), hide: vi.fn(), ...overrides }
}

function fakeFriendshipGateway(overrides: Partial<FriendshipGateway> = {}): FriendshipGateway {
  return { request: vi.fn(), accept: vi.fn(), decline: vi.fn(), remove: vi.fn(), ...overrides }
}

function mount(
  items: SuggestionDto[],
  compact = false,
  friendshipOverrides: Partial<FriendshipGateway> = {},
) {
  const container = createTestContainer()
  container
    .bind(SUGGESTIONS_GATEWAY)
    .toConstantValue(fakeSuggestionsGateway({ list: vi.fn().mockResolvedValue(items) }))
  const friendshipGateway = fakeFriendshipGateway(friendshipOverrides)
  container.bind(FRIENDSHIP_GATEWAY).toConstantValue(friendshipGateway)
  render(
    <MemoryRouter>
      <PymkBlock compact={compact} />
    </MemoryRouter>,
    { wrapper: withProviders(container) },
  )
  return { friendshipGateway }
}

describe('PymkBlock', () => {
  it('renders at most 3 cards and a "Показать всех" link in compact mode', async () => {
    mount([suggestion(1), suggestion(2), suggestion(3), suggestion(4), suggestion(5)], true)

    expect(await screen.findByText('Чел1 Тестов')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Тестов/ })).toHaveLength(3)
    expect(screen.getByRole('link', { name: 'Показать всех' })).toHaveAttribute(
      'href',
      '/friends?tab=suggestions',
    )
  })

  it('renders every suggestion and no link in full mode', async () => {
    mount([suggestion(1), suggestion(2), suggestion(3), suggestion(4)], false)

    expect(await screen.findByText('Чел1 Тестов')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Тестов/ })).toHaveLength(4)
    expect(screen.queryByRole('link', { name: 'Показать всех' })).not.toBeInTheDocument()
  })

  it('shows an empty placeholder when there are no suggestions', async () => {
    mount([], true)
    expect(await screen.findByText('Пока некого предложить')).toBeInTheDocument()
  })

  it('the friend button reflects the relation after a request is sent, instead of staying stuck on "Добавить в друзья"', async () => {
    mount([suggestion(1)], true, { request: vi.fn().mockResolvedValue('outgoing') })

    const addButton = await screen.findByRole('button', { name: 'Добавить в друзья' })
    await userEvent.click(addButton)

    expect(await screen.findByRole('button', { name: 'Заявка отправлена' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Добавить в друзья' })).not.toBeInTheDocument()
  })
})

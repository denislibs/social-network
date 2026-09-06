import { render, screen } from '@testing-library/react'
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

function mount(items: SuggestionDto[], compact = false) {
  const container = createTestContainer()
  container
    .bind(SUGGESTIONS_GATEWAY)
    .toConstantValue(fakeSuggestionsGateway({ list: vi.fn().mockResolvedValue(items) }))
  container.bind(FRIENDSHIP_GATEWAY).toConstantValue(fakeFriendshipGateway())
  render(
    <MemoryRouter>
      <PymkBlock compact={compact} />
    </MemoryRouter>,
    { wrapper: withProviders(container) },
  )
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
})

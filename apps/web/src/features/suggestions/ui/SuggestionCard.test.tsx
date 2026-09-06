import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { SuggestionDto } from '@/entities/user'
import { withProviders } from '@/shared/lib'
import { fakeSuggestionsGateway, suggestionsTestContainer } from '../model/testing'
import { SuggestionCard } from './SuggestionCard'

const suggestion: SuggestionDto = {
  id: 7,
  firstName: 'Соня',
  lastName: 'Иванова',
  screenName: 'sonya',
  city: 'Москва',
  isVerified: false,
  lastSeenAt: null,
  mutual: 3,
  sameCity: false,
}

function mount(s: SuggestionDto, overrides = {}) {
  const gateway = fakeSuggestionsGateway(overrides)
  const container = suggestionsTestContainer(gateway)
  const router = createMemoryRouter([
    {
      path: '/',
      element: <SuggestionCard suggestion={s} friendAction={<button>friend</button>} />,
    },
    { path: '/:handle', element: <div>PROFILE</div> },
  ])
  render(<RouterProvider router={router} />, { wrapper: withProviders(container) })
  return { gateway }
}

describe('SuggestionCard', () => {
  it('shows the name, mutual-friends caption and the injected friend action', () => {
    mount(suggestion)
    expect(screen.getByRole('link', { name: 'Соня Иванова' })).toHaveAttribute('href', '/sonya')
    expect(screen.getByText('3 общих друга')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'friend' })).toBeInTheDocument()
  })

  it('falls back to "Из вашего города" when there are no mutual friends but same city', () => {
    mount({ ...suggestion, mutual: 0, sameCity: true })
    expect(screen.getByText('Из вашего города')).toBeInTheDocument()
  })

  it('hides the suggestion when the "Скрыть" button is clicked', async () => {
    const { gateway } = mount(suggestion, { hide: vi.fn().mockResolvedValue(undefined) })
    await userEvent.click(screen.getByRole('button', { name: 'Скрыть' }))
    expect(gateway.hide).toHaveBeenCalledWith(7)
  })
})

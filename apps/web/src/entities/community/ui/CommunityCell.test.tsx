import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { CommunityCellDto } from '../model/types'
import { CommunityCell } from './CommunityCell'

function makeCommunity(overrides: Partial<CommunityCellDto> = {}): CommunityCellDto {
  return {
    id: 1,
    screenName: 'itclub',
    name: 'IT Клуб',
    topic: 'it',
    isVerified: false,
    membersCount: 5,
    ...overrides,
  }
}

function mount(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('CommunityCell', () => {
  it('links to /<screenName>', () => {
    mount(<CommunityCell community={makeCommunity()} />)
    expect(screen.getByRole('link', { name: /IT Клуб/ })).toHaveAttribute('href', '/itclub')
  })

  it('shows the topic and pluralized member count as subtitle', () => {
    mount(<CommunityCell community={makeCommunity({ topic: 'it', membersCount: 21 })} />)
    expect(screen.getByText('IT · 21 участник')).toBeInTheDocument()
  })

  it('pluralizes the member count correctly for a mid-range count', () => {
    mount(<CommunityCell community={makeCommunity({ membersCount: 3 })} />)
    expect(screen.getByText(/3 участника/)).toBeInTheDocument()
  })
})

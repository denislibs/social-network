import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { UserCellDto } from '../model/types'
import { UserCell } from './UserCell'

function makeUser(overrides: Partial<UserCellDto> = {}): UserCellDto {
  return {
    id: 5,
    firstName: 'Den',
    lastName: 'Ivanov',
    screenName: null,
    city: 'Москва',
    isVerified: false,
    lastSeenAt: null,
    ...overrides,
  }
}

function mount(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('UserCell', () => {
  it('links to /id<n> when there is no screen name', () => {
    mount(<UserCell user={makeUser()} />)
    expect(screen.getByRole('link', { name: /Den Ivanov/ })).toHaveAttribute('href', '/id5')
  })

  it('links to /<screenName> when set', () => {
    mount(<UserCell user={makeUser({ screenName: 'den' })} />)
    expect(screen.getByRole('link', { name: /Den Ivanov/ })).toHaveAttribute('href', '/den')
  })

  it('shows the city as subtitle by default', () => {
    mount(<UserCell user={makeUser()} />)
    expect(screen.getByText('Москва')).toBeInTheDocument()
  })

  it('prefers an explicit subtitle over the city', () => {
    mount(<UserCell user={makeUser()} subtitle="онлайн" />)
    expect(screen.getByText('онлайн')).toBeInTheDocument()
    expect(screen.queryByText('Москва')).not.toBeInTheDocument()
  })

  it('renders the after slot passthrough', () => {
    mount(<UserCell user={makeUser()} after={<span>после</span>} />)
    expect(screen.getByText('после')).toBeInTheDocument()
  })
})

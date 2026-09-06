import { Button } from '@vkontakte/vkui'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
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

/** Mounts with a real route for the profile so a navigation can actually be observed. */
function mountAtRoute(user: UserCellDto, after: React.ReactNode) {
  const router = createMemoryRouter([
    { path: '/', element: <UserCell user={user} after={after} /> },
    { path: '/:handle', element: <div>PROFILE</div> },
  ])
  render(<RouterProvider router={router} />)
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

  it('keeps the after action outside the profile link, so clicking it does not navigate', async () => {
    const onClick = vi.fn()
    mountAtRoute(makeUser(), <Button onClick={onClick}>Принять</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Принять' }))

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('PROFILE')).not.toBeInTheDocument()
  })

  it('navigates to the profile when the name is clicked', async () => {
    mountAtRoute(makeUser(), null)

    await userEvent.click(screen.getByRole('link', { name: /Den Ivanov/ }))

    expect(await screen.findByText('PROFILE')).toBeInTheDocument()
  })
})

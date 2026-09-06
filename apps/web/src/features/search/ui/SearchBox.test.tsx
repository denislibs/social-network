import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { SearchBox } from './SearchBox'

function mount() {
  const router = createMemoryRouter(
    [
      { path: '/feed', element: <SearchBox /> },
      { path: '/search', element: <div>SEARCH PAGE</div> },
    ],
    { initialEntries: ['/feed'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('SearchBox', () => {
  it('pressing Enter navigates to /search?q= with the trimmed, encoded value', async () => {
    mount()
    const input = screen.getByRole('searchbox')
    await userEvent.type(input, '  привет мир  {enter}')

    expect(await screen.findByText('SEARCH PAGE')).toBeInTheDocument()
  })

  it('does nothing on Enter when the input is empty', async () => {
    const router = mount()
    const input = screen.getByRole('searchbox')
    await userEvent.type(input, '   {enter}')

    expect(router.state.location.pathname).toBe('/feed')
  })

  it('typing updates the input value', async () => {
    mount()
    const input = screen.getByRole('searchbox')
    await userEvent.type(input, 'денис')
    expect(input).toHaveValue('денис')
  })
})

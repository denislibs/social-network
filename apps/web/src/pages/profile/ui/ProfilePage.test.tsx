import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ProfilePage } from './ProfilePage'

describe('ProfilePage', () => {
  it('renders the wall column: a create-post card and an empty wall', () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Создать пост' })).toBeDisabled()
    expect(screen.getByText('Записей пока нет')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Главная' })).toHaveAttribute('aria-selected', 'true')
  })
})

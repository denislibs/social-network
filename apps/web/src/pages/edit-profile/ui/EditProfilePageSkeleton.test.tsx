import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EditProfilePageSkeleton } from './EditProfilePageSkeleton'

describe('EditProfilePageSkeleton', () => {
  it('renders an aria-busy loading container', () => {
    render(<EditProfilePageSkeleton />)
    expect(screen.getByLabelText('Загрузка')).toHaveAttribute('aria-busy', 'true')
  })
})

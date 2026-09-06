import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CommunityPage } from './CommunityPage'

describe('CommunityPage', () => {
  it('shows the wall placeholder', () => {
    render(<CommunityPage />)
    expect(screen.getByText('Записей пока нет')).toBeInTheDocument()
  })
})

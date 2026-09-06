import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ComingSoonPage } from './ComingSoonPage'

describe('ComingSoonPage', () => {
  it('names the section in the header and the placeholder', () => {
    render(<ComingSoonPage title="Мессенджер" />)
    expect(screen.getByText('Мессенджер')).toBeInTheDocument()
    expect(screen.getByText('Раздел скоро откроется')).toBeInTheDocument()
    expect(screen.getByText(/Мессенджер появится/)).toBeInTheDocument()
  })
})

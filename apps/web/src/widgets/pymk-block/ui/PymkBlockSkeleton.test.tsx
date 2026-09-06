import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PymkBlockSkeleton } from './PymkBlockSkeleton'

describe('PymkBlockSkeleton', () => {
  it('renders the "Возможно, вы знакомы" header above the skeleton rows', () => {
    render(<PymkBlockSkeleton rows={3} />)
    expect(screen.getByText('Возможно, вы знакомы')).toBeInTheDocument()
    expect(screen.getByLabelText('Загрузка')).toBeInTheDocument()
  })
})

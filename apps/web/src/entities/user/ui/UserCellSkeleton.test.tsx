import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UserCellSkeleton } from './UserCellSkeleton'

describe('UserCellSkeleton', () => {
  it('is aria-busy with a Russian loading label', () => {
    render(<UserCellSkeleton />)
    const container = screen.getByLabelText('Загрузка')
    expect(container).toHaveAttribute('aria-busy', 'true')
  })

  it('defaults to 8 rows', () => {
    const { container } = render(<UserCellSkeleton />)
    expect(container.querySelectorAll('.vkuiSimpleCell__host')).toHaveLength(8)
  })

  it('renders a custom row count', () => {
    const { container } = render(<UserCellSkeleton rows={3} />)
    expect(container.querySelectorAll('.vkuiSimpleCell__host')).toHaveLength(3)
  })
})

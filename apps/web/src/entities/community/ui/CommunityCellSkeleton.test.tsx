import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CommunityCellSkeleton } from './CommunityCellSkeleton'

describe('CommunityCellSkeleton', () => {
  it('is aria-busy with a Russian loading label', () => {
    render(<CommunityCellSkeleton />)
    const container = screen.getByLabelText('Загрузка')
    expect(container).toHaveAttribute('aria-busy', 'true')
  })

  it('defaults to 8 rows and honors a custom count', () => {
    const { container, rerender } = render(<CommunityCellSkeleton />)
    expect(container.querySelectorAll('.vkuiSimpleCell__host')).toHaveLength(8)
    rerender(<CommunityCellSkeleton rows={4} />)
    expect(container.querySelectorAll('.vkuiSimpleCell__host')).toHaveLength(4)
  })
})

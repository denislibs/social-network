import { fireEvent, render } from '@solidjs/testing-library'
import { describe, expect, it, vi } from 'vitest'
import { Cell } from './Cell'

describe('Cell', () => {
  it('renders title, subtitle, before and after', () => {
    const { getByText, getByTestId } = render(() => (
      <Cell before={<i data-testid="b" />} after={<i data-testid="a" />} subtitle="онлайн">
        Денис Кораблев
      </Cell>
    ))
    expect(getByText('Денис Кораблев')).toBeInTheDocument()
    expect(getByText('онлайн')).toBeInTheDocument()
    expect(getByTestId('b')).toBeInTheDocument()
    expect(getByTestId('a')).toBeInTheDocument()
  })
  it('is a link when href given, a button when onClick given, div otherwise', () => {
    expect(render(() => <Cell href="/id1">x</Cell>).container.querySelector('a')).not.toBeNull()
    const onClick = vi.fn()
    const { getByRole } = render(() => <Cell onClick={onClick}>x</Cell>)
    fireEvent.click(getByRole('button'))
    expect(onClick).toHaveBeenCalled()
    expect(render(() => <Cell>x</Cell>).container.firstElementChild?.tagName).toBe('DIV')
  })
})

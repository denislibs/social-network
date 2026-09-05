import { fireEvent, render } from '@solidjs/testing-library'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('defaults to primary/m and type=button', () => {
    const { getByRole } = render(() => <Button>Сохранить</Button>)
    const b = getByRole('button')
    expect(b).toHaveAttribute('type', 'button')
    expect(b.className).toContain('mode-primary')
    expect(b.className).toContain('size-m')
  })
  it('loading shows spinner, hides label visually and blocks clicks', () => {
    const onClick = vi.fn()
    const { getByRole } = render(() => (
      <Button loading onClick={onClick}>
        Сохранить
      </Button>
    ))
    const b = getByRole('button')
    expect(b).toHaveAttribute('aria-busy', 'true')
    expect(b.querySelector('[data-spinner]')).not.toBeNull()
    fireEvent.click(b)
    expect(onClick).not.toHaveBeenCalled()
  })
  it('renders before/after slots', () => {
    const { getByTestId } = render(() => (
      <Button before={<i data-testid="b" />} after={<i data-testid="a" />}>
        X
      </Button>
    ))
    expect(getByTestId('b')).toBeInTheDocument()
    expect(getByTestId('a')).toBeInTheDocument()
  })
  it('supports Solid bound-handler form [fn, data]', () => {
    const fn = vi.fn()
    const { getByRole } = render(() => <Button onClick={[fn, 42]}>X</Button>)
    fireEvent.click(getByRole('button'))
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn.mock.calls[0]?.[0]).toBe(42)
  })
})

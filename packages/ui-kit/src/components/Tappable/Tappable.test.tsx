import { fireEvent, render } from '@solidjs/testing-library'
import { describe, expect, it, vi } from 'vitest'
import { Tappable } from './Tappable'

describe('Tappable', () => {
  it('renders given element and calls onClick', () => {
    const onClick = vi.fn()
    const { getByRole } = render(() => (
      <Tappable as="button" onClick={onClick}>
        Go
      </Tappable>
    ))
    fireEvent.click(getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
  it('adds a wave element at click point that is removed after animationend', () => {
    const { getByText } = render(() => <Tappable as="div">Tap</Tappable>)
    const el = getByText('Tap')
    fireEvent.pointerDown(el, { clientX: 10, clientY: 12 })
    const wave = el.querySelector('[data-wave]') as HTMLElement
    expect(wave).not.toBeNull()
    fireEvent.animationEnd(wave)
    expect(el.querySelector('[data-wave]')).toBeNull()
  })
  it('does not add wave when disabled', () => {
    const { getByText } = render(() => (
      <Tappable as="div" disabled>
        Tap
      </Tappable>
    ))
    fireEvent.pointerDown(getByText('Tap'))
    expect(getByText('Tap').querySelector('[data-wave]')).toBeNull()
  })
})

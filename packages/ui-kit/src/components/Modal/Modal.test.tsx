import { fireEvent, render } from '@solidjs/testing-library'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders nothing when closed and dialog when open', () => {
    const closed = render(() => (
      <Modal open={false} onClose={() => {}}>
        x
      </Modal>
    ))
    expect(closed.queryByRole('dialog')).toBeNull()
    const open = render(() => (
      <Modal open onClose={() => {}} title="Выйти?">
        x
      </Modal>
    ))
    expect(open.getByRole('dialog')).toHaveAttribute('aria-label', 'Выйти?')
  })
  it('closes on Escape and on overlay click', () => {
    const onClose = vi.fn()
    const { getByTestId } = render(() => (
      <Modal open onClose={onClose}>
        x
      </Modal>
    ))
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(getByTestId('overlay'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

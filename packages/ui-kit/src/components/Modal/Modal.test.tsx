import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

afterEach(cleanup)
describe('Modal', () => {
  it('renders nothing when closed and dialog when open', () => {
    render(() => (
      <Modal open={false} onClose={() => {}}>
        x
      </Modal>
    ))
    expect(screen.queryByRole('dialog')).toBeNull()
    cleanup()
    render(() => (
      <Modal open onClose={() => {}} title="Выйти?">
        x
      </Modal>
    ))
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Выйти?')
  })
  it('closes on Escape and on overlay click', () => {
    const onClose = vi.fn()
    render(() => (
      <Modal open onClose={onClose}>
        x
      </Modal>
    ))
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByTestId('overlay'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

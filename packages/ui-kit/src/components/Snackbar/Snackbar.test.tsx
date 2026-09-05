import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SnackbarHost, useSnackbar } from './Snackbar'

function Trigger() {
  const snack = useSnackbar()
  return (
    <button
      type="button"
      onClick={() =>
        snack.show('Ссылка скопирована', {
          duration: 1000,
          action: { label: 'Отменить', onClick: () => {} },
        })
      }
    >
      go
    </button>
  )
}
afterEach(cleanup)
describe('Snackbar', () => {
  it('shows message with action and hides after duration', () => {
    vi.useFakeTimers()
    render(() => (
      <SnackbarHost>
        <Trigger />
      </SnackbarHost>
    ))
    fireEvent.click(screen.getByText('go'))
    expect(screen.getByText('Ссылка скопирована')).toBeInTheDocument()
    expect(screen.getByText('Отменить')).toBeInTheDocument()
    vi.advanceTimersByTime(1100)
    expect(screen.queryByText('Ссылка скопирована')).toBeNull()
    vi.useRealTimers()
  })
})

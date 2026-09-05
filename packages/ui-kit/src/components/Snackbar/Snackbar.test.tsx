import { fireEvent, render } from '@solidjs/testing-library'
import { describe, expect, it, vi } from 'vitest'
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
describe('Snackbar', () => {
  it('shows message with action and hides after duration', () => {
    vi.useFakeTimers()
    const { getByText, queryByText } = render(() => (
      <SnackbarHost>
        <Trigger />
      </SnackbarHost>
    ))
    fireEvent.click(getByText('go'))
    expect(getByText('Ссылка скопирована')).toBeInTheDocument()
    expect(getByText('Отменить')).toBeInTheDocument()
    vi.advanceTimersByTime(1100)
    expect(queryByText('Ссылка скопирована')).toBeNull()
    vi.useRealTimers()
  })
})

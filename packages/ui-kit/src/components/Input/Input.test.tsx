import { fireEvent, render } from '@solidjs/testing-library'
import { describe, expect, it, vi } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('forwards native attrs and reports input', () => {
    const onInput = vi.fn()
    const { getByPlaceholderText } = render(() => (
      <Input
        placeholder="Логин"
        name="login"
        autocomplete="username"
        onInput={(e) => onInput(e.currentTarget.value)}
      />
    ))
    const el = getByPlaceholderText('Логин') as HTMLInputElement
    expect(el.name).toBe('login')
    fireEvent.input(el, { target: { value: 'den' } })
    expect(onInput).toHaveBeenCalledWith('den')
  })
  it('status=error sets aria-invalid', () => {
    const { getByRole } = render(() => <Input status="error" />)
    expect(getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useColorScheme } from './useColorScheme'

function Consumer({ name }: { name: string }) {
  const { pref, scheme, cycle } = useColorScheme()
  return (
    <>
      <output>{`${name}:${pref}:${scheme}`}</output>
      <button type="button" onClick={cycle}>{`cycle ${name}`}</button>
    </>
  )
}

describe('useColorScheme', () => {
  it('shares the preference between consumers', async () => {
    render(
      <>
        <Consumer name="a" />
        <Consumer name="b" />
      </>,
    )
    expect(screen.getByText('a:system:light')).toBeInTheDocument()
    expect(screen.getByText('b:system:light')).toBeInTheDocument()

    // system → light → dark: щёлкаем по одному потребителю, проверяем оба
    await userEvent.click(screen.getByRole('button', { name: 'cycle a' }))
    expect(screen.getByText('b:light:light')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'cycle a' }))
    expect(screen.getByText('a:dark:dark')).toBeInTheDocument()
    expect(screen.getByText('b:dark:dark')).toBeInTheDocument()
  })
})

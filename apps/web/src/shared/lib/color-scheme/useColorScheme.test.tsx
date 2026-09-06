import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createTestContainer, withDi } from '@/shared/di'
import { COLOR_SCHEME_STORE } from './ports'
import { ColorSchemeStore } from './store'
import { fakeSystemScheme, memPrefStorage } from './testing'
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

function renderConsumers() {
  const container = createTestContainer()
  container
    .bind(COLOR_SCHEME_STORE)
    .toConstantValue(new ColorSchemeStore(memPrefStorage(null), fakeSystemScheme(false).system))
  return render(
    <>
      <Consumer name="a" />
      <Consumer name="b" />
    </>,
    { wrapper: withDi(container) },
  )
}

describe('useColorScheme', () => {
  it('shares the preference between consumers', async () => {
    renderConsumers()
    expect(screen.getByText('a:system:light')).toBeInTheDocument()
    expect(screen.getByText('b:system:light')).toBeInTheDocument()

    // system → light → dark: щёлкаем по одному потребителю, проверяем оба
    await userEvent.click(screen.getByRole('button', { name: 'cycle a' }))
    expect(screen.getByText('b:light:light')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'cycle a' }))
    expect(screen.getByText('a:dark:dark')).toBeInTheDocument()
    expect(screen.getByText('b:dark:dark')).toBeInTheDocument()
  })

  it('updates the document colorScheme style', async () => {
    renderConsumers()
    await userEvent.click(screen.getByRole('button', { name: 'cycle a' }))
    expect(document.documentElement.style.colorScheme).toBe('light')
    await userEvent.click(screen.getByRole('button', { name: 'cycle a' }))
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })
})

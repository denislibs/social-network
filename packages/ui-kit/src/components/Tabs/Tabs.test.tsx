import { fireEvent, render } from '@solidjs/testing-library'
import { describe, expect, it, vi } from 'vitest'
import { Tabs } from './Tabs'

const items = [
  { id: 'all', label: 'Все' },
  { id: 'req', label: 'Заявки', counter: 3 },
]
describe('Tabs', () => {
  it('marks selected tab and switches on click', () => {
    const onChange = vi.fn()
    const { getByRole } = render(() => <Tabs value="all" onChange={onChange} items={items} />)
    expect(getByRole('tab', { name: /Все/ })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(getByRole('tab', { name: /Заявки/ }))
    expect(onChange).toHaveBeenCalledWith('req')
  })
  it('renders counters', () => {
    const { getByText } = render(() => <Tabs value="all" onChange={() => {}} items={items} />)
    expect(getByText('3')).toBeInTheDocument()
  })
})

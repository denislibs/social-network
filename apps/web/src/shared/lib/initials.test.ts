import { describe, expect, it } from 'vitest'
import { initials } from './initials'

describe('initials', () => {
  it('takes first letters upper-cased', () => {
    expect(initials('денис', 'кораблев')).toBe('ДК')
  })
  it('tolerates empty parts', () => {
    expect(initials('', 'к')).toBe('К')
    expect(initials('', '')).toBe('')
  })
})

import { describe, expect, it } from 'vitest'
import { nextPref, resolveScheme } from './theme'

describe('theme', () => {
  it('resolves system by OS preference', () => {
    expect(resolveScheme('system', true)).toBe('dark')
    expect(resolveScheme('system', false)).toBe('light')
    expect(resolveScheme('light', true)).toBe('light')
  })
  it('cycles light → dark → system → light', () => {
    expect(nextPref('light')).toBe('dark')
    expect(nextPref('dark')).toBe('system')
    expect(nextPref('system')).toBe('light')
  })
})

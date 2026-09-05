import { beforeEach, describe, expect, it } from 'vitest'
import { getPref, nextPref, resolveScheme, setPref } from './theme'

beforeEach(() => localStorage.clear())
describe('theme', () => {
  it('defaults to system and persists explicit choice', () => {
    expect(getPref()).toBe('system')
    setPref('dark')
    expect(localStorage.getItem('vk-scheme')).toBe('dark')
    expect(getPref()).toBe('dark')
    setPref('system')
    expect(localStorage.getItem('vk-scheme')).toBeNull()
  })
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

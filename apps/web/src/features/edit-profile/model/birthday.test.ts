import { describe, expect, it } from 'vitest'
import { formatBirthday, parseBirthday } from './birthday'

describe('birthday conversions', () => {
  it('parses a valid ISO date into a local Date', () => {
    const date = parseBirthday('1990-05-20')
    expect(date).toBeInstanceOf(Date)
    expect(date?.getFullYear()).toBe(1990)
    expect(date?.getMonth()).toBe(4)
    expect(date?.getDate()).toBe(20)
  })

  it('returns undefined for an empty string', () => {
    expect(parseBirthday('')).toBeUndefined()
  })

  it('returns undefined for a malformed string', () => {
    expect(parseBirthday('not-a-date')).toBeUndefined()
  })

  it('formats a Date back into YYYY-MM-DD', () => {
    expect(formatBirthday(new Date(1990, 4, 20))).toBe('1990-05-20')
  })

  it('pads single-digit month and day', () => {
    expect(formatBirthday(new Date(2005, 0, 3))).toBe('2005-01-03')
  })

  it('formats null/undefined as an empty string', () => {
    expect(formatBirthday(null)).toBe('')
    expect(formatBirthday(undefined)).toBe('')
  })

  it('round-trips a date through parse and format', () => {
    expect(formatBirthday(parseBirthday('2000-12-31'))).toBe('2000-12-31')
  })
})

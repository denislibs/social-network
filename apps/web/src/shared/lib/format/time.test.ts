import { describe, expect, it } from 'vitest'
import { relativeTime } from './time'

const NOW = new Date('2026-09-06T12:00:00.000Z').getTime()

describe('relativeTime', () => {
  it('renders "только что" for anything under a minute ago', () => {
    const iso = new Date(NOW - 30_000).toISOString()
    expect(relativeTime(iso, NOW)).toBe('только что')
  })

  it('renders minutes ago', () => {
    const iso = new Date(NOW - 5 * 60_000).toISOString()
    expect(relativeTime(iso, NOW)).toBe('5 мин назад')
  })

  it('renders hours ago', () => {
    const iso = new Date(NOW - 2 * 3_600_000).toISOString()
    expect(relativeTime(iso, NOW)).toBe('2 ч назад')
  })

  it('renders "вчера" for a day ago', () => {
    const iso = new Date(NOW - 30 * 3_600_000).toISOString()
    expect(relativeTime(iso, NOW)).toBe('вчера')
  })

  it('renders a date for anything older than two days', () => {
    const iso = new Date(NOW - 5 * 86_400_000).toISOString()
    expect(relativeTime(iso, NOW)).toBe('1 сентября')
  })

  it('includes the year when the date falls in a different year', () => {
    const iso = new Date('2025-01-10T12:00:00.000Z').toISOString()
    expect(relativeTime(iso, NOW)).toBe('10 января 2025')
  })
})

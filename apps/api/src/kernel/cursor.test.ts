import { describe, expect, it } from 'bun:test'
import { decodeCursor, encodeCursor } from './cursor'

describe('cursor', () => {
  it('round-trips', () => {
    const k = { createdAt: new Date('2026-09-06T10:00:00.000Z'), id: 42 }
    expect(decodeCursor(encodeCursor(k))).toEqual(k)
  })
  it('returns null for undefined and throws bad_cursor for garbage', () => {
    expect(decodeCursor(undefined)).toBeNull()
    expect(() => decodeCursor('!!!')).toThrow(expect.objectContaining({ code: 'bad_cursor' }))
    expect(() => decodeCursor(btoa('nope'))).toThrow(
      expect.objectContaining({ code: 'bad_cursor' }),
    )
  })
})

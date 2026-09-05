import { describe, expect, it } from 'bun:test'
import { chunkSize } from './insert'

describe('chunkSize', () => {
  it('keeps rows*cols under 60000', () => {
    expect(chunkSize(14)).toBe(4285)
    expect(chunkSize(8)).toBe(7500)
    expect(chunkSize(100)).toBe(600)
  })
})

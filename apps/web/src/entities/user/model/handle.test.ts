import { describe, expect, it } from 'vitest'
import { userHandle } from './handle'

describe('userHandle', () => {
  it('uses the screen name when set', () => {
    expect(userHandle({ id: 5, screenName: 'den' })).toBe('den')
  })

  it('falls back to id<n> when there is no screen name', () => {
    expect(userHandle({ id: 5, screenName: null })).toBe('id5')
  })
})

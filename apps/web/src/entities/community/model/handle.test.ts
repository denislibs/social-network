import { describe, expect, it } from 'vitest'
import { communityHandle } from './handle'

describe('communityHandle', () => {
  it('is always the screen name (communities always have one)', () => {
    expect(communityHandle({ screenName: 'itclub' })).toBe('itclub')
  })
})

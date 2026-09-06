import { describe, expect, it } from 'bun:test'
import { ScreenName } from './screen-name'

describe('ScreenName', () => {
  it('accepts a-z start, 3..32 of a-z 0-9 _ . and lower-cases', () => {
    expect(ScreenName.create('Denis.Korablev_1').value).toBe('denis.korablev_1')
  })
  it.each(['ab', 'x'.repeat(33), '1abc', 'ab-c', 'аб'])('rejects %s', (raw) => {
    expect(() => ScreenName.create(raw)).toThrow(
      expect.objectContaining({ code: 'invalid_screen_name' }),
    )
  })
  it.each([
    'id123',
    'club7',
    'feed',
    'im',
    'friends',
    'communities',
    'photos',
    'music',
    'search',
    'login',
    'register',
    'edit',
    'notifications',
    'api',
  ])('rejects reserved %s', (raw) => {
    expect(() => ScreenName.create(raw)).toThrow(
      expect.objectContaining({ code: 'screen_name_reserved' }),
    )
  })
  it('allows names that merely contain a reserved word', () => {
    expect(ScreenName.create('idea_club').value).toBe('idea_club')
  })
})

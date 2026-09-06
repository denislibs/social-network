import { describe, expect, it } from 'vitest'
import { codeOf, fieldFor, messageFor } from './errors'

describe('create-community errors', () => {
  it('maps known codes to messages', () => {
    expect(messageFor('invalid_community_name')).toBe('От 2 до 120 символов')
    expect(messageFor('screen_name_taken')).toBe('Короткое имя занято')
    expect(messageFor('screen_name_reserved')).toBe(
      '3–32 символа: латиница, цифры, _ . ; не начинается с id/club',
    )
    expect(messageFor('invalid_screen_name')).toBe(
      '3–32 символа: латиница, цифры, _ . ; не начинается с id/club',
    )
    expect(messageFor('anything_else')).toBe('Что-то пошло не так')
  })

  it('routes codes to fields', () => {
    expect(fieldFor('invalid_community_name')).toBe('name')
    expect(fieldFor('screen_name_taken')).toBe('screenName')
    expect(fieldFor('screen_name_reserved')).toBe('screenName')
    expect(fieldFor('invalid_screen_name')).toBe('screenName')
    expect(fieldFor('unknown')).toBe('form')
  })

  it('extracts the code from an ApiError-shaped object', () => {
    expect(codeOf({ code: 'invalid_community_name' })).toBe('invalid_community_name')
    expect(codeOf(new Error('boom'))).toBe('unknown')
    expect(codeOf(null)).toBe('unknown')
  })
})

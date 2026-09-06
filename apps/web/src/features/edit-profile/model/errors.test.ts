import { describe, expect, it } from 'vitest'
import { codeOf, fieldFor, messageFor } from './errors'

describe('edit-profile errors', () => {
  it('maps known codes to messages', () => {
    expect(messageFor('screen_name_taken')).toBe('Короткое имя занято')
    expect(messageFor('screen_name_reserved')).toBe(
      '3–32 символа: латиница, цифры, _ . ; не начинается с id/club',
    )
    expect(messageFor('invalid_screen_name')).toBe(
      '3–32 символа: латиница, цифры, _ . ; не начинается с id/club',
    )
    expect(messageFor('status_too_long')).toBe('Не длиннее 140 символов')
    expect(messageFor('bio_too_long')).toBe('Не длиннее 2000 символов')
    expect(messageFor('invalid_city')).toBe('Выберите город из списка')
    expect(messageFor('invalid_birthday')).toBe('Неверная дата рождения')
    expect(messageFor('anything_else')).toBe('Что-то пошло не так')
  })

  it('routes codes to fields', () => {
    expect(fieldFor('screen_name_taken')).toBe('screenName')
    expect(fieldFor('screen_name_reserved')).toBe('screenName')
    expect(fieldFor('invalid_screen_name')).toBe('screenName')
    expect(fieldFor('status_too_long')).toBe('status')
    expect(fieldFor('bio_too_long')).toBe('bio')
    expect(fieldFor('invalid_city')).toBe('city')
    expect(fieldFor('invalid_birthday')).toBe('birthday')
    expect(fieldFor('unknown_code')).toBe('form')
  })

  it('extracts the code from an ApiError-shaped object', () => {
    expect(codeOf({ code: 'invalid_city' })).toBe('invalid_city')
    expect(codeOf(new Error('boom'))).toBe('unknown')
    expect(codeOf(null)).toBe('unknown')
  })
})

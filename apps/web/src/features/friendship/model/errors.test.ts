import { describe, expect, it } from 'vitest'
import { codeOf, messageFor } from './errors'

describe('friendship errors', () => {
  it('maps known codes', () => {
    expect(messageFor('self_friendship')).toBe('Нельзя добавить себя в друзья')
    expect(messageFor('request_cooldown')).toBe('Заявку можно повторить через сутки')
    expect(messageFor('not_addressee')).toBe('Только адресат может ответить на заявку')
    expect(messageFor('friendship_not_found')).toBe('Заявка уже недействительна')
    expect(messageFor('anything_else')).toBe('Что-то пошло не так')
  })

  it('extracts the code from an ApiError-shaped object', () => {
    expect(codeOf({ code: 'request_cooldown' })).toBe('request_cooldown')
    expect(codeOf(new Error('boom'))).toBe('unknown')
    expect(codeOf(null)).toBe('unknown')
  })
})

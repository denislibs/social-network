import { describe, expect, it } from 'vitest'
import { codeOf, messageFor } from './errors'

describe('community-membership errors', () => {
  it('maps known codes', () => {
    expect(messageFor('last_admin')).toBe('Назначьте другого администратора перед выходом')
    expect(messageFor('community_not_found')).toBe('Сообщество не найдено')
    expect(messageFor('anything_else')).toBe('Что-то пошло не так')
  })

  it('extracts the code from an ApiError-shaped object', () => {
    expect(codeOf({ code: 'last_admin' })).toBe('last_admin')
    expect(codeOf(null)).toBe('unknown')
  })
})

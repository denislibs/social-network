import { describe, expect, it } from 'vitest'
import { codeOf, messageFor } from './errors'

describe('community-membership errors', () => {
  it('maps known codes', () => {
    expect(messageFor('last_admin')).toBe('Назначьте другого администратора перед выходом')
    expect(messageFor('community_not_found')).toBe('Сообщество не найдено')
    expect(messageFor('anything_else')).toBe('Что-то пошло не так')
  })

  it('uses a caller-supplied fallback for unknown codes', () => {
    expect(messageFor('anything_else', 'Не удалось изменить подписку')).toBe(
      'Не удалось изменить подписку',
    )
    expect(messageFor('last_admin', 'Не удалось изменить подписку')).toBe(
      'Назначьте другого администратора перед выходом',
    )
  })

  it('extracts the code from an ApiError-shaped object', () => {
    expect(codeOf({ code: 'last_admin' })).toBe('last_admin')
    expect(codeOf(null)).toBe('unknown')
  })
})

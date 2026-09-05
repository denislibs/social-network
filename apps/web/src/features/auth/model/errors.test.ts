import { describe, expect, it } from 'vitest'
import { fieldFor, messageFor } from './errors'

describe('auth errors', () => {
  it('maps known codes', () => {
    expect(messageFor('invalid_credentials')).toBe('Неверный логин или пароль')
    expect(messageFor('login_taken')).toBe('Логин занят')
    expect(messageFor('weak_password')).toBe('Минимум 8 символов')
    expect(messageFor('invalid_login')).toBe('3–32 символа: латиница, цифры, _ .')
    expect(messageFor('empty_name')).toBe('Введите имя и фамилию')
    expect(messageFor('validation')).toBe('Заполните все поля')
    expect(messageFor('anything_else')).toBe('Что-то пошло не так')
  })
  it('routes codes to fields', () => {
    expect(fieldFor('login_taken')).toBe('login')
    expect(fieldFor('invalid_login')).toBe('login')
    expect(fieldFor('weak_password')).toBe('password')
    expect(fieldFor('invalid_credentials')).toBe('form')
  })
})

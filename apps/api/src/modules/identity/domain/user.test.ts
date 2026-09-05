import { describe, expect, it } from 'bun:test'
import { FakeHasher } from '../application/testing/fakes'
import { User } from './user'
import { Login, Password } from './value-objects'

/** Код доменной ошибки, брошенной fn (сообщения — часть HTTP-контракта, по ним не матчим). */
const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn()
  } catch (e) {
    return (e as { code?: string }).code
  }
  return undefined
}

describe('Login', () => {
  it('normalizes and validates', () => {
    expect(Login.create('  Denis_01 ').value).toBe('denis_01')
    for (const bad of ['ab', 'с кириллицей', 'a'.repeat(33), 'has space'])
      expect(codeOf(() => Login.create(bad))).toBe('invalid_login')
  })
})
describe('Password', () => {
  it('rejects short', () => {
    expect(codeOf(() => Password.assertStrong('1234567'))).toBe('weak_password')
  })
})
describe('User.register', () => {
  it('hashes password, emits UserRegistered, verifies password', async () => {
    const hasher = new FakeHasher()
    const u = await User.register(
      { login: 'Denis', password: 'password123', firstName: 'Денис', lastName: 'Кораблев' },
      hasher,
    )
    expect(u.login.value).toBe('denis')
    expect(u.passwordHash).toBe('hashed:password123')
    expect(await u.verifyPassword('password123', hasher)).toBe(true)
    expect(await u.verifyPassword('nope', hasher)).toBe(false)
    const events = u.pullEvents()
    expect(events.map((e) => e.type)).toEqual(['UserRegistered'])
    expect(u.pullEvents()).toEqual([])
  })
})

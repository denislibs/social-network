import { describe, expect, it } from 'bun:test'
import { FakeHasher } from '../application/testing/fakes'
import { User } from './user'
import { Login, Password } from './value-objects'

describe('Login', () => {
  it('normalizes and validates', () => {
    expect(Login.create('  Denis_01 ').value).toBe('denis_01')
    for (const bad of ['ab', 'с кириллицей', 'a'.repeat(33), 'has space'])
      expect(() => Login.create(bad)).toThrow('invalid_login')
  })
})
describe('Password', () => {
  it('rejects short', () => {
    expect(() => Password.assertStrong('1234567')).toThrow('weak_password')
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

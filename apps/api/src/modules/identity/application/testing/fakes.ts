import type { User } from '../../domain/user'
import type { PasswordHasher, SessionStore, UserRepository } from '../ports'

export class FakeHasher implements PasswordHasher {
  async hash(pw: string) {
    return `hashed:${pw}`
  }
  async verify(pw: string, hash: string) {
    return hash === `hashed:${pw}`
  }
}
export class InMemoryUsers implements UserRepository {
  private rows = new Map<number, User>()
  private seq = 0
  async findByLogin(login: string) {
    return [...this.rows.values()].find((u) => u.login.value === login) ?? null
  }
  async findById(id: number) {
    return this.rows.get(id) ?? null
  }
  async save(user: User) {
    if (user.id === null) user.assignId(++this.seq)
    this.rows.set(user.id!, user)
    return user
  }
}
export class InMemorySessions implements SessionStore {
  tokens = new Map<string, { userId: number; touched: number }>()
  private n = 0
  async create(userId: number) {
    const t = `tok${++this.n}`
    this.tokens.set(t, { userId, touched: 0 })
    return t
  }
  async get(token: string) {
    const s = this.tokens.get(token)
    return s ? { userId: s.userId } : null
  }
  async touch(token: string) {
    const s = this.tokens.get(token)
    if (s) s.touched++
  }
  async delete(token: string) {
    this.tokens.delete(token)
  }
  async deleteAllForUser(userId: number) {
    for (const [t, s] of this.tokens) if (s.userId === userId) this.tokens.delete(t)
  }
}

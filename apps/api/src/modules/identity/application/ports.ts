import type { PasswordHasher, User } from '../domain/user'

export type { PasswordHasher }
export interface UserRepository {
  findByLogin(login: string): Promise<User | null>
  findById(id: number): Promise<User | null>
  save(user: User): Promise<User>
}
export interface SessionStore {
  create(userId: number, meta: { ua?: string }): Promise<string>
  get(token: string): Promise<{ userId: number } | null>
  touch(token: string): Promise<void>
  delete(token: string): Promise<void>
  deleteAllForUser(userId: number): Promise<void>
}

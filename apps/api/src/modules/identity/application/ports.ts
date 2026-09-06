import { token } from '../../../kernel/di'
import type { PasswordHasher, User } from '../domain/user'
import type { UserDto } from './dto'

export type { PasswordHasher }
export interface UserRepository {
  findByLogin(login: string): Promise<User | null>
  findById(id: number): Promise<User | null>
  save(user: User): Promise<User>
}
/**
 * Read side of identity. Queries project straight into DTOs instead of rehydrating the aggregate:
 * a read has no invariants to enforce, and the aggregate carries fields (the password hash) a
 * query has no business loading.
 */
export interface UserReadModel {
  getMe(userId: number): Promise<UserDto | null>
}
export interface SessionStore {
  create(userId: number, meta: { ua?: string }): Promise<string>
  get(token: string): Promise<{ userId: number } | null>
  touch(token: string): Promise<void>
  delete(token: string): Promise<void>
  deleteAllForUser(userId: number): Promise<void>
}

export const IDENTITY = {
  UserRepository: token<UserRepository>('UserRepository'),
  UserReadModel: token<UserReadModel>('UserReadModel'),
  SessionStore: token<SessionStore>('SessionStore'),
  PasswordHasher: token<PasswordHasher>('PasswordHasher'),
}

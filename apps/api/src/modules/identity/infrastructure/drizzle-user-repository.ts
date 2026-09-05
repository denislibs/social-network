import { eq } from 'drizzle-orm'
import type { Db } from '../../../db/client'
import { users } from '../../../db/schema'
import type { UserRepository } from '../application/ports'
import { User } from '../domain/user'
import { Login } from '../domain/value-objects'

type Row = typeof users.$inferSelect
const toDomain = (r: Row) =>
  User.rehydrate({
    id: r.id,
    login: Login.fromTrusted(r.login),
    passwordHash: r.passwordHash,
    firstName: r.firstName,
    lastName: r.lastName,
    screenName: r.screenName,
    createdAt: r.createdAt,
  })

export class DrizzleUserRepository implements UserRepository {
  constructor(private db: Db) {}
  async findByLogin(login: string) {
    const [r] = await this.db.select().from(users).where(eq(users.login, login)).limit(1)
    return r ? toDomain(r) : null
  }
  async findById(id: number) {
    const [r] = await this.db.select().from(users).where(eq(users.id, id)).limit(1)
    return r ? toDomain(r) : null
  }
  async save(user: User) {
    const values = {
      login: user.login.value,
      passwordHash: user.passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      screenName: user.screenName,
    }
    if (user.id === null) {
      const [r] = await this.db.insert(users).values(values).returning({ id: users.id })
      user.assignId(r!.id)
    } else {
      await this.db.update(users).set(values).where(eq(users.id, user.id))
    }
    return user
  }
}

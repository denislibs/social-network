import { eq } from 'drizzle-orm'
import type { Db } from '../../../db/client'
import { users } from '../../../db/schema'
import { ConflictError } from '../../../kernel/errors'
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

const UNIQUE_VIOLATION = '23505'
const LOGIN_CONSTRAINT = 'users_login_uq'

/**
 * The bun-sql driver reports SQLSTATE in `errno` (`code` is the generic
 * `ERR_POSTGRES_SERVER_ERROR`), and drizzle rethrows it wrapped with the driver error as `cause`.
 * Check both levels so the mapping survives either shape.
 */
function isLoginTaken(err: unknown): boolean {
  const candidates = [err, (err as { cause?: unknown } | null)?.cause]
  return candidates.some((e) => {
    const pg = e as { errno?: unknown; constraint?: unknown } | null | undefined
    return pg?.errno === UNIQUE_VIOLATION && pg?.constraint === LOGIN_CONSTRAINT
  })
}

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
      // Two concurrent registrations of the same login both pass the application-level
      // `findByLogin` check; the unique index is what actually decides. Map its violation to the
      // same 409 the pre-check produces, instead of letting it surface as a 500.
      try {
        const [r] = await this.db.insert(users).values(values).returning({ id: users.id })
        user.assignId(r!.id)
      } catch (err) {
        if (isLoginTaken(err)) throw new ConflictError('login_taken', 'Login is already taken')
        throw err
      }
    } else {
      await this.db.update(users).set(values).where(eq(users.id, user.id))
    }
    return user
  }
}

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
    status: r.status,
    bio: r.bio,
    city: r.city,
    birthday: r.birthday,
    isVerified: r.isVerified,
    createdAt: r.createdAt,
  })

const UNIQUE_VIOLATION = '23505'
const CONSTRAINT_ERRORS: Record<string, () => ConflictError> = {
  users_login_uq: () => new ConflictError('login_taken', 'Login is already taken'),
  users_screen_name_uq: () =>
    new ConflictError('screen_name_taken', 'Screen name is already taken'),
}

/**
 * The bun-sql driver reports SQLSTATE in `errno` (`code` is the generic
 * `ERR_POSTGRES_SERVER_ERROR`), and drizzle rethrows it wrapped with the driver error as `cause`.
 * Check both levels so the mapping survives either shape.
 */
function constraintErrorFor(err: unknown): ConflictError | null {
  const candidates = [err, (err as { cause?: unknown } | null)?.cause]
  for (const e of candidates) {
    const pg = e as { errno?: unknown; constraint?: unknown } | null | undefined
    if (pg?.errno === UNIQUE_VIOLATION && typeof pg.constraint === 'string') {
      const factory = CONSTRAINT_ERRORS[pg.constraint]
      if (factory) return factory()
    }
  }
  return null
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
  async findByScreenName(screenName: string) {
    const [r] = await this.db.select().from(users).where(eq(users.screenName, screenName)).limit(1)
    return r ? toDomain(r) : null
  }
  async save(user: User) {
    const values = {
      login: user.login.value,
      passwordHash: user.passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      screenName: user.screenName,
      status: user.status,
      bio: user.bio,
      city: user.city,
      birthday: user.birthday,
      isVerified: user.isVerified,
    }
    // Two concurrent writers can both pass an application-level uniqueness pre-check (login on
    // register, screen name on profile edit); the unique index is what actually decides. Map its
    // violation to the same error the pre-check would produce, instead of letting it surface as a
    // 500.
    try {
      if (user.id === null) {
        const [r] = await this.db.insert(users).values(values).returning({ id: users.id })
        user.assignId(r!.id)
      } else {
        await this.db.update(users).set(values).where(eq(users.id, user.id))
      }
    } catch (err) {
      const mapped = constraintErrorFor(err)
      if (mapped) throw mapped
      throw err
    }
    return user
  }
}

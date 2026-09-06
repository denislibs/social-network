import { asc, desc, eq, sql } from 'drizzle-orm'
import type { Db } from '../../../db/client'
import { users } from '../../../db/schema'
import type { ProfileSource, UserCellDto, UserDto } from '../application/dto'
import type { UserReadModel } from '../application/ports'

/** Threshold the trigram `%` operator compares against — the same 0.2 the old
 * `similarity(...) > 0.2` predicate used. */
export const SEARCH_SIMILARITY_THRESHOLD = 0.2

/**
 * Built as a standalone function so the infrastructure test can `EXPLAIN` the exact query the
 * read model runs rather than a hand-copied lookalike that could silently drift from it.
 *
 * `x % lower($1)` is the *indexable* trigram operator: it can be answered from
 * `users_name_trgm` / `users_screen_name_trgm` (`gin_trgm_ops`, see `db/schema/identity.ts`),
 * whereas the `similarity(x, lower($1)) > 0.2` it replaces is an ordinary function call in a
 * predicate, which the planner cannot match to an index — it seq-scanned every user. The
 * `like … || '%'` arms stay: they catch the short prefixes trigram similarity under-ranks, and
 * gin_trgm_ops serves them from the same index. `similarity()` still drives ORDER BY, which needs
 * no index. Ranked by similarity first, then by `popularityRank` ascending (lower rank = more
 * popular — the seeder sets `popularity_rank = round(1/popularity)`).
 */
export function searchUsersQuery(db: Pick<Db, 'select'>, q: string, limit: number) {
  const nameExpr = sql`lower(${users.firstName} || ' ' || ${users.lastName})`
  return db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      screenName: users.screenName,
      city: users.city,
      isVerified: users.isVerified,
      lastSeenAt: users.lastSeenAt,
    })
    .from(users)
    .where(
      sql`${nameExpr} % lower(${q}) or ${nameExpr} like lower(${q}) || '%' or lower(${users.screenName}) like lower(${q}) || '%'`,
    )
    .orderBy(desc(sql<number>`similarity(${nameExpr}, lower(${q}))`), asc(users.popularityRank))
    .limit(limit)
}

/**
 * Reads project straight into the DTO shape — one `select` of exactly the columns the response
 * carries, no aggregate rehydration and no password hash pulled into memory.
 */
export class DrizzleUserReadModel implements UserReadModel {
  constructor(private db: Db) {}

  async getMe(userId: number): Promise<UserDto | null> {
    const [r] = await this.db
      .select({
        id: users.id,
        login: users.login,
        firstName: users.firstName,
        lastName: users.lastName,
        screenName: users.screenName,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    return r ? { ...r, createdAt: r.createdAt.toISOString() } : null
  }

  async getProfile(idOrScreen: string): Promise<ProfileSource | null> {
    const idMatch = /^id(\d+)$/i.exec(idOrScreen)
    const cond = idMatch
      ? eq(users.id, Number(idMatch[1]))
      : eq(users.screenName, idOrScreen.toLowerCase())
    const [r] = await this.db
      .select({
        id: users.id,
        login: users.login,
        firstName: users.firstName,
        lastName: users.lastName,
        screenName: users.screenName,
        createdAt: users.createdAt,
        status: users.status,
        bio: users.bio,
        city: users.city,
        birthday: users.birthday,
        isVerified: users.isVerified,
      })
      .from(users)
      .where(cond)
      .limit(1)
    return r ? { ...r, createdAt: r.createdAt.toISOString() } : null
  }

  /**
   * The `%` threshold is *session* state (`pg_trgm.similarity_threshold`) and bun-sql hands out a
   * pooled connection per statement, so a connection-lifetime `set_limit()` would leak into
   * whatever query landed on that connection next. `SET LOCAL` inside a transaction scopes it to
   * exactly this query.
   */
  async searchUsers(q: string, limit: number): Promise<UserCellDto[]> {
    const rows = await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`SET LOCAL pg_trgm.similarity_threshold = ${sql.raw(String(SEARCH_SIMILARITY_THRESHOLD))}`,
      )
      return searchUsersQuery(tx, q, limit)
    })
    return rows.map((r) => ({ ...r, lastSeenAt: r.lastSeenAt ? r.lastSeenAt.toISOString() : null }))
  }
}

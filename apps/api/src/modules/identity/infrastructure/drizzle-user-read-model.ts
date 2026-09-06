import { asc, desc, eq, sql } from 'drizzle-orm'
import type { Db } from '../../../db/client'
import { users } from '../../../db/schema'
import type { ProfileDto, UserCellDto, UserDto } from '../application/dto'
import type { UserReadModel } from '../application/ports'

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

  async getProfile(idOrScreen: string): Promise<Omit<ProfileDto, 'counters' | 'relation'> | null> {
    const idMatch = /^id(\d+)$/.exec(idOrScreen)
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
   * `similarity() > 0.2` (pg_trgm, needs `gin_trgm_ops` index — see `db/schema/identity.ts`)
   * catches fuzzy matches; the `like … || '%'` clauses catch short prefixes trigram similarity
   * alone tends to under-rank. Ranked by similarity first, then by `popularityRank` ascending
   * (lower rank = more popular — the seeder sets `popularity_rank = round(1/popularity)`).
   */
  async searchUsers(q: string, limit: number): Promise<UserCellDto[]> {
    const nameExpr = sql`lower(${users.firstName} || ' ' || ${users.lastName})`
    const simExpr = sql<number>`similarity(${nameExpr}, lower(${q}))`
    const rows = await this.db
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
        sql`${simExpr} > 0.2 or ${nameExpr} like lower(${q}) || '%' or lower(${users.screenName}) like lower(${q}) || '%'`,
      )
      .orderBy(desc(simExpr), asc(users.popularityRank))
      .limit(limit)
    return rows.map((r) => ({ ...r, lastSeenAt: r.lastSeenAt ? r.lastSeenAt.toISOString() : null }))
  }
}

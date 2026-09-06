import { eq, sql } from 'drizzle-orm'
import type { Db } from '../../../db/client'
import { users } from '../../../db/schema'
import type { UserExistence } from '../application/ports'

/** `select 1 from users where id = $1` — the cheapest possible "is this a real user id?", with
 * no profile columns pulled in and no dependency on identity's read model. */
export class DrizzleUserExistence implements UserExistence {
  constructor(private db: Db) {}

  async exists(userId: number): Promise<boolean> {
    const [row] = await this.db
      .select({ one: sql<number>`1` })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    return row !== undefined
  }
}

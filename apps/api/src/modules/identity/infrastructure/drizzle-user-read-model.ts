import { eq } from 'drizzle-orm'
import type { Db } from '../../../db/client'
import { users } from '../../../db/schema'
import type { UserDto } from '../application/dto'
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
}

import { and, eq } from 'drizzle-orm'
import type { Db } from '../../../db/client'
import { follows } from '../../../db/schema'
import type { FollowRepository } from '../application/ports'

export class DrizzleFollowRepository implements FollowRepository {
  constructor(private db: Db) {}

  async add(followerId: number, target: { type: 'user' | 'community'; id: number }): Promise<void> {
    await this.db
      .insert(follows)
      .values({ followerId, targetType: target.type, targetId: target.id })
      .onConflictDoNothing()
  }

  async remove(
    followerId: number,
    target: { type: 'user' | 'community'; id: number },
  ): Promise<void> {
    await this.db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.targetType, target.type),
          eq(follows.targetId, target.id),
        ),
      )
  }
}

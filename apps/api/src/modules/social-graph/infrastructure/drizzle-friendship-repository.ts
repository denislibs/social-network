import { and, eq } from 'drizzle-orm'
import type { Db } from '../../../db/client'
import { friendships } from '../../../db/schema'
import type { FriendshipRepository } from '../application/ports'
import { Friendship } from '../domain/friendship'
import { orderPair } from '../domain/value-objects'

export class DrizzleFriendshipRepository implements FriendshipRepository {
  constructor(private db: Db) {}

  async find(a: number, b: number): Promise<Friendship | null> {
    const { lo, hi } = orderPair(a, b)
    const [r] = await this.db
      .select()
      .from(friendships)
      .where(and(eq(friendships.userLo, lo), eq(friendships.userHi, hi)))
      .limit(1)
    if (!r) return null
    return Friendship.rehydrate({
      lo: r.userLo,
      hi: r.userHi,
      status: r.status,
      requesterId: r.requesterId,
      createdAt: r.createdAt,
      acceptedAt: r.acceptedAt,
    })
  }

  /**
   * The insert's `onConflictDoUpdate` on `(user_lo, user_hi)` is itself the concurrency arbiter —
   * two concurrent inserts for the same pair serialise on the unique index, the loser updates
   * instead of erroring, so no separate race/ConflictError mapping is needed here.
   */
  async save(f: Friendship): Promise<void> {
    const p = f.props
    if (f.isRemoved) {
      await this.db
        .delete(friendships)
        .where(and(eq(friendships.userLo, p.lo), eq(friendships.userHi, p.hi)))
      return
    }
    await this.db
      .insert(friendships)
      .values({
        userLo: p.lo,
        userHi: p.hi,
        status: p.status,
        requesterId: p.requesterId,
        createdAt: p.createdAt,
        acceptedAt: p.acceptedAt,
      })
      .onConflictDoUpdate({
        target: [friendships.userLo, friendships.userHi],
        set: {
          status: p.status,
          requesterId: p.requesterId,
          createdAt: p.createdAt,
          acceptedAt: p.acceptedAt,
        },
      })
  }
}

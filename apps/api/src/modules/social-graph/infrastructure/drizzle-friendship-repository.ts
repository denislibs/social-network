import { and, eq, sql } from 'drizzle-orm'
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
   *
   * The one case a blind "overwrite with the incoming row's values" gets wrong is a genuine
   * *mutual* race: A and B each concurrently call `SendFriendRequest` on the other, both read no
   * existing row (`find` returns null for both), and both therefore build a brand-new *pending*
   * `Friendship.request(...)` instead of one of them observing the other's row and calling
   * `counterRequest`/`accept` (the sequential path, which already lands on `accepted` before it
   * ever reaches `save`). Whichever insert commits first wins the row; the second's conflicting
   * insert would otherwise just overwrite it with its own "pending, I'm the requester" values —
   * silently discarding the first request and leaving the pair pending forever from the loser's
   * direction instead of friends. The `case` below detects exactly that shape at conflict time
   * (existing row still pending, from a *different* requester than the one now conflicting) and
   * resolves it the same way the sequential counter-request path would: `accepted`, `accepted_at`
   * = now, keeping the original requester and original `created_at`. Every other conflict shape
   * (a real update from `accept`/`decline`/`remove`/`rerequest`, or a duplicate insert from the
   * same requester) always has `requester_id` unchanged from the existing row, so the condition
   * is false there and the plain "use the incoming values" behavior is unaffected.
   */
  async save(f: Friendship): Promise<void> {
    const p = f.props
    if (f.isRemoved) {
      await this.db
        .delete(friendships)
        .where(and(eq(friendships.userLo, p.lo), eq(friendships.userHi, p.hi)))
      return
    }
    const mutualRace = sql`${friendships.status} = 'pending' and ${friendships.requesterId} <> excluded.requester_id`
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
          status: sql`case when ${mutualRace} then 'accepted'::friendship_status else excluded.status end`,
          requesterId: sql`case when ${mutualRace} then ${friendships.requesterId} else excluded.requester_id end`,
          createdAt: sql`case when ${mutualRace} then ${friendships.createdAt} else excluded.created_at end`,
          acceptedAt: sql`case when ${mutualRace} then now() else excluded.accepted_at end`,
        },
      })
  }
}

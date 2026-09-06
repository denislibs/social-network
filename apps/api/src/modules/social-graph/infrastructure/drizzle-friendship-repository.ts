import { and, eq, sql } from 'drizzle-orm'
import type { Db } from '../../../db/client'
import { friendships } from '../../../db/schema'
import type { FriendshipRepository, SaveOutcome } from '../application/ports'
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
      declinedAt: r.declinedAt,
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
   *
   * The outcome is read back off the same statement via `RETURNING ..., (xmax = 0) AS inserted`
   * — Postgres sets `xmax` to 0 on a row a statement itself inserted, and to the updating
   * transaction's id when it instead hit the `ON CONFLICT DO UPDATE` path, so `xmax = 0` is a
   * reliable "did *this* statement create the row" test without a second round-trip. When the
   * statement went through the update path (`inserted` false) and the aggregate being saved was
   * `pending` but the row that comes back is `accepted`, this save must be the one that lost the
   * mutual-request race handled by `mutualRace` above — the caller uses `'raced_accepted'` to
   * publish the `FriendshipAccepted` event that the race would otherwise never produce.
   */
  async save(f: Friendship): Promise<SaveOutcome> {
    const p = f.props
    if (f.isRemoved) {
      await this.db
        .delete(friendships)
        .where(and(eq(friendships.userLo, p.lo), eq(friendships.userHi, p.hi)))
      return 'deleted'
    }
    const mutualRace = sql`${friendships.status} = 'pending' and ${friendships.requesterId} <> excluded.requester_id`
    const [row] = await this.db
      .insert(friendships)
      .values({
        userLo: p.lo,
        userHi: p.hi,
        status: p.status,
        requesterId: p.requesterId,
        createdAt: p.createdAt,
        acceptedAt: p.acceptedAt,
        declinedAt: p.declinedAt,
      })
      .onConflictDoUpdate({
        target: [friendships.userLo, friendships.userHi],
        set: {
          status: sql`case when ${mutualRace} then 'accepted'::friendship_status else excluded.status end`,
          requesterId: sql`case when ${mutualRace} then ${friendships.requesterId} else excluded.requester_id end`,
          createdAt: sql`case when ${mutualRace} then ${friendships.createdAt} else excluded.created_at end`,
          acceptedAt: sql`case when ${mutualRace} then now() else excluded.accepted_at end`,
          declinedAt: sql`case when ${mutualRace} then ${friendships.declinedAt} else excluded.declined_at end`,
        },
      })
      .returning({ status: friendships.status, inserted: sql<boolean>`(xmax = 0)` })
    if (!row) throw new Error('friendship upsert returned no row')
    if (!row.inserted && p.status === 'pending' && row.status === 'accepted')
      return 'raced_accepted'
    return row.inserted ? 'inserted' : 'updated'
  }
}

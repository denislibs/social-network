import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Db } from '../../../db/client'
import { communities, communityMembers } from '../../../db/schema'
import type { CommunityRepository } from '../application/ports'
import { Community, type MemberRole } from '../domain/community'
import { CommunityNotFound } from '../domain/errors'

type CommunityRow = typeof communities.$inferSelect
/** The transaction handle drizzle hands to `db.transaction(cb)` — same query surface as `Db`. */
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

export class DrizzleCommunityRepository implements CommunityRepository {
  constructor(private db: Db) {}

  private async loadMembers(tx: Tx | Db, communityId: number): Promise<Map<number, MemberRole>> {
    const rows = await tx
      .select({ userId: communityMembers.userId, role: communityMembers.role })
      .from(communityMembers)
      .where(eq(communityMembers.communityId, communityId))
    return new Map(rows.map((r) => [r.userId, r.role]))
  }

  private async toDomain(row: CommunityRow, tx: Tx | Db = this.db): Promise<Community> {
    const members = await this.loadMembers(tx, row.id)
    return Community.rehydrate({
      id: row.id,
      screenName: row.screenName,
      name: row.name,
      description: row.description,
      topic: row.topic,
      createdAt: row.createdAt,
      members,
    })
  }

  async findById(id: number): Promise<Community | null> {
    const [r] = await this.db.select().from(communities).where(eq(communities.id, id)).limit(1)
    return r ? this.toDomain(r) : null
  }

  async findByScreenName(s: string): Promise<Community | null> {
    const [r] = await this.db
      .select()
      .from(communities)
      .where(eq(communities.screenName, s.toLowerCase()))
      .limit(1)
    return r ? this.toDomain(r) : null
  }

  /**
   * Diffs `community_members` against the aggregate's member map (insert what's new, delete what's
   * gone, update roles that changed) instead of a delete-then-reinsert-everything, so unrelated
   * members' `created_at` isn't churned on every write.
   */
  private async syncMembers(
    tx: Tx,
    id: number,
    members: ReadonlyMap<number, MemberRole>,
  ): Promise<void> {
    const existingRows = await tx
      .select({ userId: communityMembers.userId, role: communityMembers.role })
      .from(communityMembers)
      .where(eq(communityMembers.communityId, id))
    const existing = new Map(existingRows.map((r) => [r.userId, r.role]))

    const toInsert: { communityId: number; userId: number; role: MemberRole }[] = []
    const toUpdate: { userId: number; role: MemberRole }[] = []
    for (const [userId, role] of members) {
      const cur = existing.get(userId)
      if (cur === undefined) toInsert.push({ communityId: id, userId, role })
      else if (cur !== role) toUpdate.push({ userId, role })
    }
    const toDelete = [...existing.keys()].filter((userId) => !members.has(userId))

    if (toInsert.length) await tx.insert(communityMembers).values(toInsert)
    for (const u of toUpdate)
      await tx
        .update(communityMembers)
        .set({ role: u.role })
        .where(and(eq(communityMembers.communityId, id), eq(communityMembers.userId, u.userId)))
    if (toDelete.length)
      await tx
        .delete(communityMembers)
        .where(
          and(eq(communityMembers.communityId, id), inArray(communityMembers.userId, toDelete)),
        )
  }

  /**
   * Upserts the community row, then syncs its members.
   *
   * Wrapped in a transaction: the community row's `members_count` and the actual member rows must
   * commit together, or a failed member insert (e.g. a nonexistent user id violating the FK) would
   * leave `members_count` updated without the corresponding row ever landing.
   *
   * `save` reads nothing first, so it carries no protection against a concurrent writer — it is
   * for creating a community (and for tests that set up a known state). Every membership change
   * that has to respect an invariant goes through `withLock` instead.
   */
  async save(c: Community): Promise<Community> {
    const p = c.props
    const members = c.memberEntries()

    await this.db.transaction(async (tx) => {
      if (p.id === null) {
        const [r] = await tx
          .insert(communities)
          .values({
            screenName: p.screenName,
            name: p.name,
            description: p.description,
            topic: p.topic,
            createdAt: p.createdAt,
            membersCount: members.size,
          })
          .returning({ id: communities.id })
        c.assignId(r!.id)
      } else {
        await tx
          .update(communities)
          .set({
            screenName: p.screenName,
            name: p.name,
            description: p.description,
            topic: p.topic,
            membersCount: members.size,
          })
          .where(eq(communities.id, p.id))
      }
      await this.syncMembers(tx, c.props.id as number, members)
    })

    return c
  }

  /**
   * Read-modify-write of one community's membership under a row lock.
   *
   * `SELECT … FOR UPDATE` on the `communities` row is taken *first*, so two concurrent membership
   * changes on the same community serialise: the second transaction blocks until the first
   * commits and only then loads the member rows, seeing the first one's committed state. That is
   * what makes `Community`'s invariants (last admin cannot leave, join is idempotent) hold under
   * real concurrency — the aggregate stays the invariant holder, the lock just guarantees it is
   * reasoning about current state rather than a stale snapshot.
   *
   * `members_count` is recomputed from the member rows themselves (`select count(*)`) rather than
   * from the aggregate's map, so the denormalised counter can never drift from the rows it counts.
   */
  async withLock<T>(id: number, fn: (c: Community) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(communities)
        .where(eq(communities.id, id))
        .limit(1)
        .for('update')
      if (!row) throw new CommunityNotFound()

      const community = await this.toDomain(row, tx)
      const result = await fn(community)

      await this.syncMembers(tx, id, community.memberEntries())
      await tx
        .update(communities)
        .set({
          membersCount: sql`(select count(*) from ${communityMembers} where ${communityMembers.communityId} = ${id})`,
        })
        .where(eq(communities.id, id))
      return result
    })
  }
}

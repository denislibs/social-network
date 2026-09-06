import { and, eq, inArray } from 'drizzle-orm'
import type { Db } from '../../../db/client'
import { communities, communityMembers } from '../../../db/schema'
import type { CommunityRepository } from '../application/ports'
import { Community, type MemberRole } from '../domain/community'

type CommunityRow = typeof communities.$inferSelect

export class DrizzleCommunityRepository implements CommunityRepository {
  constructor(private db: Db) {}

  private async loadMembers(communityId: number): Promise<Map<number, MemberRole>> {
    const rows = await this.db
      .select({ userId: communityMembers.userId, role: communityMembers.role })
      .from(communityMembers)
      .where(eq(communityMembers.communityId, communityId))
    return new Map(rows.map((r) => [r.userId, r.role]))
  }

  private async toDomain(row: CommunityRow): Promise<Community> {
    const members = await this.loadMembers(row.id)
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
      .where(eq(communities.screenName, s))
      .limit(1)
    return r ? this.toDomain(r) : null
  }

  /**
   * Upserts the community row, then diffs `community_members` against the aggregate's member map
   * (insert what's new, delete what's gone, update roles that changed) instead of a delete-then-
   * reinsert-everything, so unrelated members' `created_at` isn't churned on every save.
   */
  async save(c: Community): Promise<Community> {
    const p = c.props
    const members = c.memberEntries()

    if (p.id === null) {
      const [r] = await this.db
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
      await this.db
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
    const id = c.props.id as number

    const existingRows = await this.db
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

    if (toInsert.length) await this.db.insert(communityMembers).values(toInsert)
    for (const u of toUpdate)
      await this.db
        .update(communityMembers)
        .set({ role: u.role })
        .where(and(eq(communityMembers.communityId, id), eq(communityMembers.userId, u.userId)))
    if (toDelete.length)
      await this.db
        .delete(communityMembers)
        .where(
          and(eq(communityMembers.communityId, id), inArray(communityMembers.userId, toDelete)),
        )

    return c
  }
}

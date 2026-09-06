import type { Topic } from '@vkc/contracts'
import { and, desc, eq, ne, or, sql } from 'drizzle-orm'
import type { Db } from '../../../db/client'
import { communities, communityMembers, follows, friendships, users } from '../../../db/schema'
import { type CursorKey, decodeCursor, encodeCursor, PAGE_SIZE } from '../../../kernel/cursor'
import type { Counters, Relation } from '../../../kernel/social-read'
import type {
  CommunityCellDto,
  CommunityDto,
  HandleDto,
  Membership,
  Page,
  SuggestionDto,
  UserCellDto,
} from '../application/dto'
import type { SocialReadModel } from '../application/ports'
import { orderPair } from '../domain/value-objects'
import { PYMK_SQL } from './pymk.sql'
import { rawQuery } from './raw'

/** Threshold the trigram `%` operator compares against — the same 0.2 the old
 * `similarity(...) > 0.2` predicate used. */
const SEARCH_SIMILARITY_THRESHOLD = 0.2

type UserCellRow = {
  id: number
  firstName: string
  lastName: string
  screenName: string | null
  city: string | null
  isVerified: boolean
  lastSeenAt: Date | string | null
}

function toUserCell(r: UserCellRow): UserCellDto {
  return {
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    screenName: r.screenName,
    city: r.city,
    isVerified: r.isVerified,
    lastSeenAt: r.lastSeenAt ? new Date(r.lastSeenAt).toISOString() : null,
  }
}

/**
 * Fetches `PAGE_SIZE + 1` rows ordered by the same key `keyOf` reads back. When the extra row is
 * present it proves there's a next page; the returned page is the first `PAGE_SIZE` rows, and
 * `nextCursor` is built from the *last row actually returned* (not the extra 21st row) — the
 * keyset predicate is a strict `<`, so a cursor built from the 21st row would make its own key
 * unreachable by the next page (it's excluded by both this page, which never returns it, and the
 * next page's strict `<`), silently dropping one row at every page boundary.
 */
function paginate<R>(rows: R[], keyOf: (r: R) => CursorKey): Page<R> {
  if (rows.length > PAGE_SIZE) {
    const items = rows.slice(0, PAGE_SIZE)
    return { items, nextCursor: encodeCursor(keyOf(items[PAGE_SIZE - 1] as R)) }
  }
  return { items: rows, nextCursor: null }
}

const cellCols = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  screenName: users.screenName,
  city: users.city,
  isVerified: users.isVerified,
  lastSeenAt: users.lastSeenAt,
}

export class DrizzleSocialReadModel implements SocialReadModel {
  constructor(private db: Db) {}

  async relation(me: number | null, other: number): Promise<Relation> {
    if (me === null) return 'none'
    if (me === other) return 'self'
    const { lo, hi } = orderPair(me, other)
    const [row] = await this.db
      .select({ status: friendships.status, requesterId: friendships.requesterId })
      .from(friendships)
      .where(and(eq(friendships.userLo, lo), eq(friendships.userHi, hi)))
      .limit(1)
    if (!row || row.status === 'declined') return 'none'
    if (row.status === 'accepted') return 'friends'
    return row.requesterId === me ? 'outgoing' : 'incoming'
  }

  async counters(userId: number): Promise<Counters> {
    const n = sql<number>`count(*)::int`
    const [[friendsRow], [followersRow], [communitiesRow], [incomingRow]] = await Promise.all([
      this.db
        .select({ n })
        .from(friendships)
        .where(
          and(
            eq(friendships.status, 'accepted'),
            or(eq(friendships.userLo, userId), eq(friendships.userHi, userId)),
          ),
        ),
      this.db
        .select({ n })
        .from(follows)
        .where(and(eq(follows.targetType, 'user'), eq(follows.targetId, userId))),
      this.db.select({ n }).from(communityMembers).where(eq(communityMembers.userId, userId)),
      this.db
        .select({ n })
        .from(friendships)
        .where(
          and(
            eq(friendships.status, 'pending'),
            or(eq(friendships.userLo, userId), eq(friendships.userHi, userId)),
            ne(friendships.requesterId, userId),
          ),
        ),
    ])
    return {
      friends: friendsRow?.n ?? 0,
      followers: followersRow?.n ?? 0,
      communities: communitiesRow?.n ?? 0,
      incomingRequests: incomingRow?.n ?? 0,
    }
  }

  /**
   * A friend's page key is `(coalesce(accepted_at, created_at), <friend's user id>)` — the friend
   * row itself has no single id column (it's keyed by the ordered pair), so the *other* user's id
   * stands in for "this row's id" in the keyset.
   */
  async friends(userId: number, cursor?: string): Promise<Page<UserCellDto>> {
    const key = decodeCursor(cursor)
    const friendIds = this.db.$with('friend_ids').as(
      this.db
        .select({
          friendId:
            sql<number>`case when ${friendships.userLo} = ${userId} then ${friendships.userHi} else ${friendships.userLo} end`.as(
              'friend_id',
            ),
          sortTs: sql<Date>`coalesce(${friendships.acceptedAt}, ${friendships.createdAt})`.as(
            'sort_ts',
          ),
        })
        .from(friendships)
        .where(
          and(
            eq(friendships.status, 'accepted'),
            or(eq(friendships.userLo, userId), eq(friendships.userHi, userId)),
          ),
        ),
    )
    const rows = await this.db
      .with(friendIds)
      .select({ ...cellCols, sortTs: friendIds.sortTs })
      .from(friendIds)
      .innerJoin(users, eq(users.id, friendIds.friendId))
      .where(
        key
          ? sql`(date_trunc('milliseconds', ${friendIds.sortTs}), ${friendIds.friendId}) < (${key.createdAt.toISOString()}::timestamptz, ${key.id})`
          : undefined,
      )
      .orderBy(desc(sql`date_trunc('milliseconds', ${friendIds.sortTs})`), desc(friendIds.friendId))
      .limit(PAGE_SIZE + 1)
    const page = paginate(rows, (r) => ({ createdAt: new Date(r.sortTs), id: r.id }))
    return { items: page.items.map(toUserCell), nextCursor: page.nextCursor }
  }

  async requests(
    me: number,
    dir: 'incoming' | 'outgoing',
    cursor?: string,
  ): Promise<Page<UserCellDto>> {
    const key = decodeCursor(cursor)
    const otherExpr = sql<number>`case when ${friendships.userLo} = ${me} then ${friendships.userHi} else ${friendships.userLo} end`
    const req = this.db.$with('req').as(
      this.db
        .select({ otherId: otherExpr.as('other_id'), createdAt: friendships.createdAt })
        .from(friendships)
        .where(
          and(
            eq(friendships.status, 'pending'),
            or(eq(friendships.userLo, me), eq(friendships.userHi, me)),
            dir === 'incoming' ? ne(friendships.requesterId, me) : eq(friendships.requesterId, me),
          ),
        ),
    )
    const rows = await this.db
      .with(req)
      .select({ ...cellCols, createdAt: req.createdAt })
      .from(req)
      .innerJoin(users, eq(users.id, req.otherId))
      .where(
        key
          ? sql`(date_trunc('milliseconds', ${req.createdAt}), ${req.otherId}) < (${key.createdAt.toISOString()}::timestamptz, ${key.id})`
          : undefined,
      )
      .orderBy(desc(sql`date_trunc('milliseconds', ${req.createdAt})`), desc(req.otherId))
      .limit(PAGE_SIZE + 1)
    const page = paginate(rows, (r) => ({ createdAt: r.createdAt, id: r.id }))
    return { items: page.items.map(toUserCell), nextCursor: page.nextCursor }
  }

  async followers(userId: number, cursor?: string): Promise<Page<UserCellDto>> {
    const key = decodeCursor(cursor)
    const rows = await this.db
      .select({ ...cellCols, createdAt: follows.createdAt })
      .from(follows)
      .innerJoin(users, eq(users.id, follows.followerId))
      .where(
        and(
          eq(follows.targetType, 'user'),
          eq(follows.targetId, userId),
          key
            ? sql`(date_trunc('milliseconds', ${follows.createdAt}), ${follows.followerId}) < (${key.createdAt.toISOString()}::timestamptz, ${key.id})`
            : undefined,
        ),
      )
      .orderBy(
        desc(sql`date_trunc('milliseconds', ${follows.createdAt})`),
        desc(follows.followerId),
      )
      .limit(PAGE_SIZE + 1)
    const page = paginate(rows, (r) => ({ createdAt: r.createdAt, id: r.id }))
    return { items: page.items.map(toUserCell), nextCursor: page.nextCursor }
  }

  async community(idOrScreen: string, me: number | null): Promise<CommunityDto | null> {
    // Accepts a bare numeric id, the `club{n}` handle prefix (case-insensitively, same as
    // `resolveHandle`), or a screen name.
    const clubMatch = /^club(\d+)$/i.exec(idOrScreen)
    let numericId: number | null = null
    if (clubMatch) numericId = Number(clubMatch[1])
    else if (/^\d+$/.test(idOrScreen)) numericId = Number(idOrScreen)
    const [row] = await this.db
      .select()
      .from(communities)
      .where(
        numericId !== null
          ? eq(communities.id, numericId)
          : eq(communities.screenName, idOrScreen.toLowerCase()),
      )
      .limit(1)
    if (!row) return null

    let membership: Membership = 'none'
    let isFollowing = false
    if (me !== null) {
      const [m] = await this.db
        .select({ role: communityMembers.role })
        .from(communityMembers)
        .where(and(eq(communityMembers.communityId, row.id), eq(communityMembers.userId, me)))
        .limit(1)
      membership = m?.role ?? 'none'
      const [f] = await this.db
        .select({ followerId: follows.followerId })
        .from(follows)
        .where(
          and(
            eq(follows.followerId, me),
            eq(follows.targetType, 'community'),
            eq(follows.targetId, row.id),
          ),
        )
        .limit(1)
      isFollowing = f !== undefined
    }
    return {
      id: row.id,
      screenName: row.screenName,
      name: row.name,
      description: row.description,
      topic: row.topic,
      isVerified: row.isVerified,
      membersCount: row.membersCount,
      membership,
      isFollowing,
    }
  }

  async members(communityId: number, cursor?: string): Promise<Page<UserCellDto>> {
    const key = decodeCursor(cursor)
    const rows = await this.db
      .select({ ...cellCols, createdAt: communityMembers.createdAt })
      .from(communityMembers)
      .innerJoin(users, eq(users.id, communityMembers.userId))
      .where(
        and(
          eq(communityMembers.communityId, communityId),
          key
            ? sql`(date_trunc('milliseconds', ${communityMembers.createdAt}), ${communityMembers.userId}) < (${key.createdAt.toISOString()}::timestamptz, ${key.id})`
            : undefined,
        ),
      )
      .orderBy(
        desc(sql`date_trunc('milliseconds', ${communityMembers.createdAt})`),
        desc(communityMembers.userId),
      )
      .limit(PAGE_SIZE + 1)
    const page = paginate(rows, (r) => ({ createdAt: r.createdAt, id: r.id }))
    return { items: page.items.map(toUserCell), nextCursor: page.nextCursor }
  }

  async myCommunities(me: number): Promise<CommunityCellDto[]> {
    return this.db
      .select({
        id: communities.id,
        screenName: communities.screenName,
        name: communities.name,
        topic: communities.topic,
        isVerified: communities.isVerified,
        membersCount: communities.membersCount,
      })
      .from(communityMembers)
      .innerJoin(communities, eq(communities.id, communityMembers.communityId))
      .where(eq(communityMembers.userId, me))
      .orderBy(desc(communityMembers.createdAt))
  }

  async suggestions(me: number): Promise<SuggestionDto[]> {
    const rows = await rawQuery<UserCellRow & { mutual: number; sameCity: boolean }>(
      this.db,
      PYMK_SQL,
      [me],
    )
    return rows.map((r) => ({ ...toUserCell(r), mutual: r.mutual, sameCity: r.sameCity }))
  }

  /**
   * `lower(name) % lower($1)` is the indexable trigram operator, served by `communities_name_trgm`
   * (`gin_trgm_ops`, migration 0003); the `similarity(...) > 0.2` it replaces is an ordinary
   * function call in a predicate, which the planner cannot match to an index — it seq-scanned
   * every community. The `like … || '%'` arm still covers the short prefixes trigram similarity
   * under-ranks, and `similarity()` still drives ORDER BY, which needs no index.
   *
   * The `%` threshold is session state and bun-sql pools connections, so `SET LOCAL` inside a
   * transaction pins it to this query instead of leaking onto the next user of that connection.
   */
  async searchCommunities(q: string, limit: number): Promise<CommunityCellDto[]> {
    const rows = await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`SET LOCAL pg_trgm.similarity_threshold = ${sql.raw(String(SEARCH_SIMILARITY_THRESHOLD))}`,
      )
      return tx.execute(sql`
        select id::int as id, screen_name as "screenName", name, topic,
               is_verified as "isVerified", members_count as "membersCount"
        from communities
        where lower(name) % lower(${q}) or lower(name) like lower(${q}) || '%'
        order by similarity(lower(name), lower(${q})) desc, members_count desc
        limit ${limit}`)
    })
    // `execute` on a raw statement is untyped (`Record<string, any>`), so the projection back
    // into the DTO is spelled out rather than asserted wholesale.
    return rows.map((r) => ({
      id: r.id as number,
      screenName: r.screenName as string,
      name: r.name as string,
      topic: r.topic as Topic,
      isVerified: r.isVerified as boolean,
      membersCount: r.membersCount as number,
    }))
  }

  /** Handles are case-insensitive: screen names are stored lower-cased, and the `id{n}`/`club{n}`
   * prefixes must match however the user typed them (`ID1`, `ClubKino`, a pasted `/Club42` link). */
  async resolveHandle(handle: string): Promise<HandleDto | null> {
    const normalized = handle.toLowerCase()
    const idMatch = /^id(\d+)$/i.exec(handle)
    if (idMatch) {
      const [u] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, Number(idMatch[1])))
        .limit(1)
      return u ? { kind: 'user', id: u.id } : null
    }
    const clubMatch = /^club(\d+)$/i.exec(handle)
    if (clubMatch) {
      const [c] = await this.db
        .select({ id: communities.id })
        .from(communities)
        .where(eq(communities.id, Number(clubMatch[1])))
        .limit(1)
      return c ? { kind: 'community', id: c.id } : null
    }
    const [u] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.screenName, normalized))
      .limit(1)
    if (u) return { kind: 'user', id: u.id }
    const [c] = await this.db
      .select({ id: communities.id })
      .from(communities)
      .where(eq(communities.screenName, normalized))
      .limit(1)
    return c ? { kind: 'community', id: c.id } : null
  }
}

import { sql } from 'drizzle-orm'
import type { Db } from '../../src/db/client'
import { communities, communityMembers, follows, friendships, users } from '../../src/db/schema'

export type GraphFixtureOptions = {
  /** Number of accepted friends to give user 1 (ids 2..1+n). Default 10 — see the base layout below. */
  friendsOf1?: number
  /** Switches to the small, self-contained PYMK graph described below instead of the base layout. */
  pymk?: boolean
}

export type GraphFixtureResult = {
  /** Number of accepted friends user 1 ends up with (echoes the `friendsOf1` option, default 10). */
  friendsOf1: number
  /** Number of communities user 1 is a member of in the base layout (kino + it_club). Not set in pymk mode. */
  communitiesOf1: number
}

/**
 * Deterministic social graph for `DrizzleSocialReadModel` tests. Two layouts, chosen by options:
 *
 * BASE layout (default, `pymk` falsy) — `friendsOf1` accepted friends for user 1:
 *   - Users 1..N (N = max(30, 3 + friendsOf1)): names `Имя{n} Фамилия{n}`; screen names `u{n}`
 *     for n<=5 (rest null); city «Москва» for n<=15, else «Казань».
 *   - Friendships: user 1 accepted-friends with ids 2..(1+friendsOf1). To mirror what
 *     `sendFriendRequestHandler` does (a `follows` row from whoever requested), the *first half*
 *     of that range (2..1+ceil(friendsOf1/2)) are the requesters — each contributes a follow row
 *     them→1, counted in user 1's followers — and user 1 is the requester for the *second half*
 *     (contributing a follow row 1→them, NOT counted in user 1's followers). With the default
 *     friendsOf1=10 that is ids 2..6 (5 users) requesting user 1, and user 1 requesting ids 7..11.
 *   - `pendingIncoming` (id = 2+friendsOf1) → pending, requested *them* to user 1: relation
 *     'incoming' for user 1, plus a follow row pendingIncoming→1.
 *   - `pendingOutgoing` (id = 3+friendsOf1) → pending, user 1 requested *them*: relation
 *     'outgoing' for user 1, plus a follow row 1→pendingOutgoing (not counted in followers(1)).
 *   - `plainFollower` (id = 4+friendsOf1) plainly follows user 1 (no friendship row at all).
 *   - Communities: `kino` (topic cinema, members 1 [admin], 2, 3) and `it_club` (topic it,
 *     members 1 [admin]) — `communitiesOf1` = 2.
 *
 *   With the default friendsOf1=10: friends(1) = 10, followers(1) = 5 (ids 2..6, the half that
 *   requested user 1) + 1 (pendingIncoming) + 1 (plainFollower) = 7, incomingRequests(1) = 1.
 *
 * PYMK layout (`pymk: true`) — a separate, minimal 11-user graph, independent of the base layout
 * (no shared ids/cities), built to make `suggestions(1)` resolve to exactly ids [7, 8, 11]:
 *   - User 1 in city «Москва», accepted-friends with 2,3,4,5,6 (all city «Казань» — irrelevant to
 *     the "same city" candidate path, kept off it on purpose).
 *   - User 7 accepted-friends with 2,3,4 → 3 mutual friends with user 1.
 *   - User 8 accepted-friends with 2 → 1 mutual friend with user 1.
 *   - User 9 has a pending request with user 1 (9 → 1) → excluded from suggestions regardless of
 *     any other match.
 *   - User 10 accepted-friends with 2 (same shape as user 8, so it would otherwise qualify) but
 *     is hidden by user 1 (`friend_suggestion_hidden`) → excluded.
 *   - User 11 shares user 1's city («Москва», the only other Москва user in this layout) and
 *     follows the same community topic user 1 follows (both follow `kino`, topic cinema) but has
 *     no friendship with anyone → surfaced only via the "same city + shared topic" path.
 *   No one is a `community_members` row here (only `follows`), so the PYMK query's
 *   shared-communities path stays empty and only the intended three candidates surface.
 */
export async function graphFixture(
  db: Db,
  opts: GraphFixtureOptions = {},
): Promise<GraphFixtureResult> {
  if (opts.pymk) {
    await seedPymkGraph(db)
    return { friendsOf1: 5, communitiesOf1: 0 }
  }
  const friendsOf1 = opts.friendsOf1 ?? 10
  await seedBaseGraph(db, friendsOf1)
  return { friendsOf1, communitiesOf1: 2 }
}

const MOSCOW = 'Москва'
const KAZAN = 'Казань'

async function insertUsers(db: Db, ids: number[], cityOf: (n: number) => string): Promise<void> {
  await db.insert(users).values(
    ids.map((n) => ({
      id: n,
      login: `user${n}`,
      passwordHash: 'x',
      firstName: `Имя${n}`,
      lastName: `Фамилия${n}`,
      screenName: n <= 5 ? `u${n}` : null,
      city: cityOf(n),
    })),
  )
  // Identity columns need the sequence bumped past explicitly-inserted ids, or a later
  // `generatedByDefaultAsIdentity` insert (outside this fixture) would collide.
  await db.execute(
    sql`select setval(pg_get_serial_sequence('users','id'), (select max(id) from users))`,
  )
}

async function seedBaseGraph(db: Db, friendsOf1: number): Promise<void> {
  const requestedByThem = 2 + Math.ceil(friendsOf1 / 2) // exclusive upper bound of the "they requested 1" half
  const friendIds = Array.from({ length: friendsOf1 }, (_, i) => 2 + i)
  const pendingIncoming = 2 + friendsOf1
  const pendingOutgoing = 3 + friendsOf1
  const plainFollower = 4 + friendsOf1
  const totalUsers = Math.max(30, plainFollower)
  const allIds = Array.from({ length: totalUsers }, (_, i) => i + 1)

  await insertUsers(db, allIds, (n) => (n <= 15 ? MOSCOW : KAZAN))

  const now = new Date('2026-01-01T00:00:00Z')
  for (const [i, id] of friendIds.entries()) {
    const theyRequested = id < requestedByThem
    const requesterId = theyRequested ? id : 1
    const addresseeId = theyRequested ? 1 : id
    const acceptedAt = new Date(now.getTime() + i * 1000)
    await db.insert(friendships).values({
      userLo: Math.min(1, id),
      userHi: Math.max(1, id),
      status: 'accepted',
      requesterId,
      createdAt: acceptedAt,
      acceptedAt,
    })
    await db
      .insert(follows)
      .values({ followerId: requesterId, targetType: 'user', targetId: addresseeId })
  }

  await db.insert(friendships).values({
    userLo: 1,
    userHi: pendingIncoming,
    status: 'pending',
    requesterId: pendingIncoming,
    createdAt: now,
    acceptedAt: null,
  })
  await db.insert(follows).values({ followerId: pendingIncoming, targetType: 'user', targetId: 1 })

  await db.insert(friendships).values({
    userLo: 1,
    userHi: pendingOutgoing,
    status: 'pending',
    requesterId: 1,
    createdAt: now,
    acceptedAt: null,
  })
  await db.insert(follows).values({ followerId: 1, targetType: 'user', targetId: pendingOutgoing })

  await db.insert(follows).values({ followerId: plainFollower, targetType: 'user', targetId: 1 })

  const [kino] = await db
    .insert(communities)
    .values({
      screenName: 'kino',
      name: 'Кино',
      description: null,
      topic: 'cinema',
      membersCount: 3,
    })
    .returning({ id: communities.id })
  const [itClub] = await db
    .insert(communities)
    .values({
      screenName: 'it_club',
      name: 'IT Клуб',
      description: null,
      topic: 'it',
      membersCount: 1,
    })
    .returning({ id: communities.id })

  await db.insert(communityMembers).values([
    { communityId: kino!.id, userId: 1, role: 'admin' },
    { communityId: kino!.id, userId: 2, role: 'member' },
    { communityId: kino!.id, userId: 3, role: 'member' },
    { communityId: itClub!.id, userId: 1, role: 'admin' },
  ])
}

async function seedPymkGraph(db: Db): Promise<void> {
  const cityOf = (n: number) => (n === 1 || n === 11 ? MOSCOW : KAZAN)
  await insertUsers(
    db,
    Array.from({ length: 11 }, (_, i) => i + 1),
    cityOf,
  )

  const now = new Date('2026-01-01T00:00:00Z')
  const acceptedPair = async (a: number, b: number) => {
    const [lo, hi] = a < b ? [a, b] : [b, a]
    await db.insert(friendships).values({
      userLo: lo,
      userHi: hi,
      status: 'accepted',
      requesterId: a,
      createdAt: now,
      acceptedAt: now,
    })
    await db.insert(follows).values({ followerId: a, targetType: 'user', targetId: b })
  }

  for (const f of [2, 3, 4, 5, 6]) await acceptedPair(1, f)
  for (const f of [2, 3, 4]) await acceptedPair(7, f)
  await acceptedPair(8, 2)
  await acceptedPair(10, 2) // otherwise-qualifying candidate, excluded below via friend_suggestion_hidden

  await db.insert(friendships).values({
    userLo: 1,
    userHi: 9,
    status: 'pending',
    requesterId: 9,
    createdAt: now,
    acceptedAt: null,
  })
  await db.insert(follows).values({ followerId: 9, targetType: 'user', targetId: 1 })

  await db.execute(sql`insert into friend_suggestion_hidden (user_id, hidden_id) values (1, 10)`)

  const [kino] = await db
    .insert(communities)
    .values({
      screenName: 'kino',
      name: 'Кино',
      description: null,
      topic: 'cinema',
      membersCount: 0,
    })
    .returning({ id: communities.id })
  await db.insert(follows).values([
    { followerId: 1, targetType: 'community', targetId: kino!.id },
    { followerId: 11, targetType: 'community', targetId: kino!.id },
  ])
}

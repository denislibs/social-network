import type { Rng } from '../rng'
import type { Follow, Friendship, Membership } from './graph'
import type { SeedCommunity, SeedUser } from './types'
import { SEED_NOW } from './types'

/** Demo account requirements (task 15 controller ruling): exactly this many rows, so the
 * `demo`/`demo1234` login always has friend requests to accept/cancel in the UI without relying
 * on population-dependent pool sizes. */
const DEMO_ACCEPTED = 30
const DEMO_INCOMING = 5
const DEMO_OUTGOING = 3
const DEMO_COMMUNITIES = 4
const DEMO_CITY = 'Москва'
/** Unchanged hand-tuned network for the secondary demo account — no pending-request contract. */
const DENIS_FRIENDS = 80
const DENIS_COMMUNITIES = 15

export type DemoGraphResult = {
  demo: SeedUser
  denis: SeedUser
  friendships: Friendship[]
  follows: Follow[]
  memberships: Membership[]
}

function makeSeedUser(
  id: number,
  login: string,
  firstName: string,
  lastName: string,
  status: string | null,
  city: string,
): SeedUser {
  const interests = new Float32Array(12)
  interests[0] = 0.4
  interests[1] = 0.4
  interests[4] = 0.2
  return {
    id,
    login,
    firstName,
    lastName,
    screenName: login,
    city,
    birthday: '1996-05-14',
    sex: 'male',
    interests,
    tier: 'regular',
    popularity: 0.001,
    createdAt: new Date(SEED_NOW - 400 * 86400_000),
    status,
  }
}

function pickClubs(communities: SeedCommunity[], n: number): SeedCommunity[] {
  return communities
    .filter((c) => ['cinema', 'music', 'it'].includes(c.topic))
    .toSorted((a, b) => b.popularity - a.popularity)
    .slice(0, n)
}

function joinClubs(
  userId: number,
  communities: SeedCommunity[],
  follows: Follow[],
  memberships: Membership[],
): void {
  for (const c of communities) {
    follows.push({
      followerId: userId,
      targetType: 'community',
      targetId: c.id,
      createdAt: new Date(SEED_NOW),
    })
    memberships.push({ communityId: c.id, userId, role: 'member', createdAt: new Date(SEED_NOW) })
  }
}

/**
 * Builds the two hand-holdable demo accounts and the rows to append to the generated population
 * (`friendships`/`follows`/`memberships`), pure and deterministic given the same `users`,
 * `communities` and `rng` seed. Ids follow `users.length + 1` / `+2`, matching the historical
 * `addDemoUsers` behaviour so a re-run with the same seed produces identical rows.
 *
 * `demo` (login `demo`, password `SEED_DEMO_PASSWORD`/`demo1234`) gets exactly 30 accepted
 * friendships, 5 incoming pending requests, 3 outgoing pending requests and membership in 4
 * communities, city Москва — the fixed shape task 15's Playwright/manual walkthrough relies on.
 * Pending rows mirror what `sendFriendRequestHandler` actually does (see
 * `apps/api/src/modules/social-graph/application/commands/send-friend-request.ts`): the
 * requester also gets a `follows(user)` row pointed at the addressee, fresh-request only.
 */
export function buildDemoGraph(
  users: SeedUser[],
  communities: SeedCommunity[],
  rng: Rng,
): DemoGraphResult {
  const demoId = users.length + 1
  const denisId = users.length + 2
  const demo = makeSeedUser(demoId, 'demo', 'Демо', 'Пользователь', null, DEMO_CITY)
  const denis = makeSeedUser(
    denisId,
    'deniscoreablev',
    'Денис',
    'Кораблев',
    'Глажу кота',
    'Санкт-Петербург',
  )

  const friendships: Friendship[] = []
  const follows: Follow[] = []
  const memberships: Membership[] = []

  const need = DEMO_ACCEPTED + DEMO_INCOMING + DEMO_OUTGOING
  const moscowPool = rng.shuffle(
    users.filter((u) => u.tier === 'regular' && u.city === DEMO_CITY).map((u) => u.id),
  )
  if (moscowPool.length < need)
    throw new Error(
      `buildDemoGraph: need ${need} distinct regular users in ${DEMO_CITY} for demo, only ${moscowPool.length} available — increase --scale`,
    )
  const accepted = moscowPool.slice(0, DEMO_ACCEPTED)
  const incoming = moscowPool.slice(DEMO_ACCEPTED, DEMO_ACCEPTED + DEMO_INCOMING)
  const outgoing = moscowPool.slice(DEMO_ACCEPTED + DEMO_INCOMING, need)

  for (const other of accepted)
    friendships.push({
      lo: Math.min(demoId, other),
      hi: Math.max(demoId, other),
      status: 'accepted',
      requesterId: other,
      createdAt: new Date(SEED_NOW - rng.int(1, 300) * 86400_000),
      acceptedAt: new Date(SEED_NOW),
    })

  // Incoming: the other user is the requester, so they are the one who follows demo.
  for (const other of incoming) {
    friendships.push({
      lo: Math.min(demoId, other),
      hi: Math.max(demoId, other),
      status: 'pending',
      requesterId: other,
      createdAt: new Date(SEED_NOW - rng.int(1, 14) * 86400_000),
      acceptedAt: null,
    })
    follows.push({
      followerId: other,
      targetType: 'user',
      targetId: demoId,
      createdAt: new Date(SEED_NOW),
    })
  }

  // Outgoing: demo is the requester, so demo follows the addressee.
  for (const other of outgoing) {
    friendships.push({
      lo: Math.min(demoId, other),
      hi: Math.max(demoId, other),
      status: 'pending',
      requesterId: demoId,
      createdAt: new Date(SEED_NOW - rng.int(1, 14) * 86400_000),
      acceptedAt: null,
    })
    follows.push({
      followerId: demoId,
      targetType: 'user',
      targetId: other,
      createdAt: new Date(SEED_NOW),
    })
  }

  joinClubs(demoId, pickClubs(communities, DEMO_COMMUNITIES), follows, memberships)

  // denis: same pool-based approach as the original addDemoUsers, no pending-request contract.
  const denisPool = rng
    .shuffle(users.filter((u) => u.tier === 'regular' && u.city === denis.city).map((u) => u.id))
    .slice(0, DENIS_FRIENDS)
  for (const other of denisPool)
    friendships.push({
      lo: Math.min(denisId, other),
      hi: Math.max(denisId, other),
      status: 'accepted',
      requesterId: other,
      createdAt: new Date(SEED_NOW - rng.int(1, 300) * 86400_000),
      acceptedAt: new Date(SEED_NOW),
    })
  joinClubs(denisId, pickClubs(communities, DENIS_COMMUNITIES), follows, memberships)

  return { demo, denis, friendships, follows, memberships }
}

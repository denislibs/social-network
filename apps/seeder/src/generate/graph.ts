import { cumulative, type Rng } from '../rng'
import { TOPICS } from '../topics'
import type { SeedCommunity, SeedUser } from './types'
import { SEED_NOW } from './types'

export type Friendship = {
  lo: number
  hi: number
  status: 'pending' | 'accepted'
  requesterId: number
  createdAt: Date
  acceptedAt: Date | null
}
export type Follow = {
  followerId: number
  targetType: 'user' | 'community'
  targetId: number
  createdAt: Date
}
export type Membership = {
  communityId: number
  userId: number
  role: 'member' | 'editor' | 'admin'
  createdAt: Date
}

export function dominantTopic(u: SeedUser): number {
  let best = 0
  for (let i = 1; i < u.interests.length; i++) if (u.interests[i]! > u.interests[best]!) best = i
  return best
}
const key = (a: number, b: number) => Math.min(a, b) * 2_097_152 + Math.max(a, b)

/** Smallest same-city+same-dominant-topic bucket still worth drawing from (below it every draw
 * would be a near-certain duplicate, so we go straight to the city pool). */
const MIN_LOCAL_POOL = 4
/** Draws inside the city+topic bucket before degrading to a same-city draw. */
const LOCAL_TRIES = 4

/**
 * Per user: round(lognormal(ln 30, 0.8)) initiated links (cap 1500).
 * Target pool split: 55% "local", 25% same dominant topic (any city), 20% random.
 * "local" is same city AND same dominant topic (compound homophily); the city+topic bucket is
 * small and saturates fast, so a draw that hits an existing pair (or a bucket below
 * MIN_LOCAL_POOL) degrades to a same-city draw instead of being wasted — the branch stays
 * 100% same-city while carrying as much topic homophily as the bucket can supply.
 */
export function generateFriendships(users: SeedUser[], rng: Rng): Friendship[] {
  const byCity = new Map<string, number[]>()
  const byCityTopic = new Map<string, number[]>()
  const byTopic: number[][] = TOPICS.map(() => [])
  for (const u of users) {
    const t = dominantTopic(u)
    byTopic[t]!.push(u.id)
    const city = byCity.get(u.city)
    if (city) city.push(u.id)
    else byCity.set(u.city, [u.id])
    const ck = `${u.city}|${t}`
    const cityTopic = byCityTopic.get(ck)
    if (cityTopic) cityTopic.push(u.id)
    else byCityTopic.set(ck, [u.id])
  }
  const seen = new Set<number>()
  const out: Friendship[] = []
  const now = SEED_NOW
  for (const u of users) {
    const deg = Math.min(1500, Math.round(rng.lognormal(Math.log(30), 0.8)))
    const t = dominantTopic(u)
    const cityTopic = byCityTopic.get(`${u.city}|${t}`) ?? []
    const city = byCity.get(u.city) ?? []
    for (let i = 0; i < deg; i++) {
      const r = rng.next()
      let other: number
      if (r < 0.55 && city.length > 1) {
        other = 0
        for (let a = 0; a < LOCAL_TRIES && other === 0 && cityTopic.length >= MIN_LOCAL_POOL; a++) {
          const cand = rng.pick(cityTopic)
          if (cand !== u.id && !seen.has(key(u.id, cand))) other = cand
        }
        if (other === 0) other = rng.pick(city)
      } else if (r < 0.8) other = rng.pick(byTopic[t]!)
      else other = rng.int(1, users.length)
      if (other === u.id) continue
      const k = key(u.id, other)
      if (seen.has(k)) continue
      seen.add(k)
      const target = users[other - 1]!
      const accepts = target.tier === 'star' ? rng.chance(0.3) : rng.chance(0.94)
      const createdAt = new Date(now - rng.next() * 3 * 365 * 86_400_000)
      out.push({
        lo: Math.min(u.id, other),
        hi: Math.max(u.id, other),
        status: accepts ? 'accepted' : 'pending',
        requesterId: u.id,
        createdAt,
        acceptedAt: accepts ? new Date(createdAt.getTime() + rng.int(60, 3 * 86_400) * 1000) : null,
      })
    }
  }
  return out
}

/** mu of the per-user follow count (brief value: ln 45). */
const FOLLOW_MU = Math.log(45)
/** Star/notable weight exponent. Linear popularity only separates stars from notables by ~2.6x
 * at scale 0.04 (4 stars saturate at ~40% of the population), below the >5x the graph test
 * requires; squared popularity gives 5.6x there. */
const POP_EXP = 2
/** Draws inside the follower's own interests before widening the community pool. */
const TOPIC_TRIES = 3

/**
 * Per user: round(lognormal(FOLLOW_MU, 0.7)) follow attempts, 65% community / 35% star-notable.
 * Both branches are gated on a topic drawn from the follower's interest weights, so follows
 * carry the interest signal the feed model (subsystem 4) trains on:
 *   community → popularity-weighted inside the drawn topic; when that topic is exhausted for this
 *   follower (no communities at all, or he already follows them all) the pick moves to the
 *   remaining communities of his *other* non-zero interest topics, and only when every interest
 *   topic is exhausted does it fall back to a global popularity draw. At small scales the
 *   follower runs out of interest-matching communities before the follow-count thresholds are
 *   met, so that last fallback still fires — see the task report for the arithmetic ceiling.
 *   star/notable → popularity^POP_EXP-weighted inside the drawn topic.
 */
export function generateFollows(
  users: SeedUser[],
  communities: SeedCommunity[],
  rng: Rng,
): { follows: Follow[]; memberships: Membership[] } {
  const commByTopic = TOPICS.map((t) => communities.filter((c) => c.topic === t))
  const commCum = commByTopic.map((cs) => cumulative(cs.map((c) => c.popularity)))
  const allCommCum = cumulative(communities.map((c) => c.popularity))
  const popByTopic = TOPICS.map((_, ti) =>
    users.filter((u) => u.tier !== 'regular' && u.interests[ti]! > 0),
  )
  const popCum = popByTopic.map((us) => cumulative(us.map((u) => u.popularity ** POP_EXP)))
  const seen = new Set<string>()
  const follows: Follow[] = []
  const now = SEED_NOW

  const pickCommunity = (
    ti: number,
    interestTopics: number[],
    owned: Set<number>,
  ): SeedCommunity | null => {
    const inTopic = commByTopic[ti]!
    for (let a = 0; a < TOPIC_TRIES && inTopic.length > 0; a++) {
      const c = inTopic[rng.weightedIndex(commCum[ti]!)]!
      if (!owned.has(c.id)) return c
    }
    // The drawn topic is exhausted for this follower: take the remaining communities of his
    // other interest topics exactly (popularity-weighted) instead of wasting draws.
    const rest: SeedCommunity[] = []
    for (const tj of interestTopics) {
      for (const c of commByTopic[tj]!) if (!owned.has(c.id)) rest.push(c)
    }
    if (rest.length > 0) return rest[rng.weightedIndex(cumulative(rest.map((c) => c.popularity)))]!
    // Every community of every interest topic is already followed — only then go global.
    const c = communities[rng.weightedIndex(allCommCum)]!
    return owned.has(c.id) ? null : c
  }

  for (const u of users) {
    const n = Math.round(rng.lognormal(FOLLOW_MU, 0.7))
    const interestCum = cumulative(u.interests)
    const interestTopics: number[] = []
    for (let t = 0; t < u.interests.length; t++) if (u.interests[t]! > 0) interestTopics.push(t)
    const owned = new Set<number>()
    for (let i = 0; i < n; i++) {
      const ti = rng.weightedIndex(interestCum)
      let f: Follow | null = null
      if (rng.chance(0.65) && communities.length) {
        const c = pickCommunity(ti, interestTopics, owned)
        if (c) {
          owned.add(c.id)
          f = {
            followerId: u.id,
            targetType: 'community',
            targetId: c.id,
            createdAt: new Date(now - rng.next() * 2 * 365 * 86_400_000),
          }
        }
      } else if (popByTopic[ti]!.length) {
        const t = popByTopic[ti]![rng.weightedIndex(popCum[ti]!)]!
        if (t.id !== u.id) {
          f = {
            followerId: u.id,
            targetType: 'user',
            targetId: t.id,
            createdAt: new Date(now - rng.next() * 2 * 365 * 86_400_000),
          }
        }
      }
      if (!f) continue
      const k = `${f.followerId}:${f.targetType}:${f.targetId}`
      if (seen.has(k)) continue
      seen.add(k)
      follows.push(f)
    }
  }
  const memberships: Membership[] = []
  const perCommunity = new Map<number, Membership[]>()
  for (const f of follows) {
    if (f.targetType === 'community') {
      const m: Membership = {
        communityId: f.targetId,
        userId: f.followerId,
        role: 'member',
        createdAt: f.createdAt,
      }
      memberships.push(m)
      const bucket = perCommunity.get(f.targetId)
      if (bucket) bucket.push(m)
      else perCommunity.set(f.targetId, [m])
    }
  }
  for (const c of communities) {
    const ms = perCommunity.get(c.id) ?? []
    if (ms.length === 0) {
      // Nobody followed this community: seed an admin, and the matching Follow row so the
      // membership/follow invariant (every membership mirrors a follow) still holds.
      const userId = rng.int(1, users.length)
      follows.push({
        followerId: userId,
        targetType: 'community',
        targetId: c.id,
        createdAt: c.createdAt,
      })
      seen.add(`${userId}:community:${c.id}`)
      memberships.push({ communityId: c.id, userId, role: 'admin', createdAt: c.createdAt })
      continue
    }
    ms[0]!.role = 'admin'
    for (let i = 1; i < Math.min(ms.length, 1 + rng.int(0, 3)); i++) ms[i]!.role = 'editor'
  }
  return { follows, memberships }
}

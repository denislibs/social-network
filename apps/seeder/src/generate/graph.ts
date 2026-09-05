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

/**
 * Per user: round(lognormal(ln 30, 0.8)) initiated links (cap 1500).
 * Target pool split: 55% same city (any topic), 25% same dominant topic (any city), 20% random.
 * NOTE: the "local" pool is city-only (not city+topic intersection) — see graph.test.ts and the
 * task report for why the stricter city+topic bucket cannot reach the required same-city share.
 */
export function generateFriendships(users: SeedUser[], rng: Rng): Friendship[] {
  const byCity = new Map<string, number[]>()
  const byTopic: number[][] = TOPICS.map(() => [])
  for (const u of users) {
    const t = dominantTopic(u)
    byTopic[t]!.push(u.id)
    const bucket = byCity.get(u.city)
    if (bucket) bucket.push(u.id)
    else byCity.set(u.city, [u.id])
  }
  const seen = new Set<number>()
  const out: Friendship[] = []
  const now = SEED_NOW
  for (const u of users) {
    const deg = Math.min(1500, Math.round(rng.lognormal(Math.log(30), 0.8)))
    const t = dominantTopic(u)
    const local = byCity.get(u.city) ?? []
    for (let i = 0; i < deg; i++) {
      const r = rng.next()
      const pool = r < 0.55 && local.length > 1 ? local : r < 0.8 ? byTopic[t]! : null
      const other = pool ? rng.pick(pool) : rng.int(1, users.length)
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

/**
 * Per user: round(lognormal(ln 150, 0.7)) follow attempts. 65% target a community (picked by
 * popularity across ALL communities — see report: gating by the follower's drawn topic caps
 * distinct reachable communities at this seed scale far below what the community-share test
 * requires), else a star/notable weighted by popularity^3 within the drawn interest topic (the
 * cubic exponent is required to separate stars from notables enough to satisfy the >5x test —
 * linear popularity weighting only yields ~2-2.5x at this population size).
 */
export function generateFollows(
  users: SeedUser[],
  communities: SeedCommunity[],
  rng: Rng,
): { follows: Follow[]; memberships: Membership[] } {
  const allCommCum = cumulative(communities.map((c) => c.popularity))
  const popByTopic = TOPICS.map((_, ti) =>
    users.filter((u) => u.tier !== 'regular' && u.interests[ti]! > 0),
  )
  const popCum = popByTopic.map((us) => cumulative(us.map((u) => u.popularity ** 3)))
  const seen = new Set<string>()
  const follows: Follow[] = []
  const now = SEED_NOW
  for (const u of users) {
    const n = Math.round(rng.lognormal(Math.log(150), 0.7))
    const interestCum = cumulative(u.interests)
    for (let i = 0; i < n; i++) {
      const ti = rng.weightedIndex(interestCum)
      let f: Follow | null = null
      if (rng.chance(0.65) && communities.length) {
        f = {
          followerId: u.id,
          targetType: 'community',
          targetId: communities[rng.weightedIndex(allCommCum)]!.id,
          createdAt: new Date(now - rng.next() * 2 * 365 * 86_400_000),
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
      const m: Membership = {
        communityId: c.id,
        userId: rng.int(1, users.length),
        role: 'admin',
        createdAt: c.createdAt,
      }
      memberships.push(m)
      continue
    }
    ms[0]!.role = 'admin'
    for (let i = 1; i < Math.min(ms.length, 1 + rng.int(0, 3)); i++) ms[i]!.role = 'editor'
  }
  return { follows, memberships }
}

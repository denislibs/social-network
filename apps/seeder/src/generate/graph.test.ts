import { describe, expect, it } from 'bun:test'
import { CORPUS } from '../corpus'
import { Rng } from '../rng'
import { TOPICS } from '../topics'
import { generateCommunities } from './communities'
import { dominantTopic, type Follow, generateFollows, generateFriendships } from './graph'
import type { SeedCommunity, SeedUser } from './types'
import { generateUsers } from './users'

/** Share of community follows whose community topic is a non-zero interest of the follower. */
function interestMatchShare(
  users: SeedUser[],
  communities: SeedCommunity[],
  follows: Follow[],
): number {
  const topicOf = new Map(communities.map((c) => [c.id, TOPICS.indexOf(c.topic)]))
  const cf = follows.filter((f) => f.targetType === 'community')
  const hit = cf.filter((f) => users[f.followerId - 1]!.interests[topicOf.get(f.targetId)!]! > 0)
  return hit.length / cf.length
}
/** Share of friendships whose two ends share both city and dominant topic. */
function cityTopicShare(users: SeedUser[], pairs: { lo: number; hi: number }[]): number {
  const byId = new Map(users.map((u) => [u.id, u]))
  return (
    pairs.filter((f) => {
      const a = byId.get(f.lo)!
      const b = byId.get(f.hi)!
      return a.city === b.city && dominantTopic(a) === dominantTopic(b)
    }).length / pairs.length
  )
}

const cfg = { seed: 7, scale: 0.04, days: 90 }
const rng = new Rng(cfg.seed)
const users = generateUsers(cfg, rng.fork('users'))
const communities = generateCommunities(cfg, rng.fork('communities'), CORPUS)

describe('generateFriendships', () => {
  const fr = generateFriendships(users, rng.fork('friends'))
  it('pairs are ordered, unique, no self loops', () => {
    const keys = new Set<string>()
    for (const f of fr) {
      expect(f.lo).toBeLessThan(f.hi)
      keys.add(`${f.lo}-${f.hi}`)
      expect([f.lo, f.hi]).toContain(f.requesterId)
    }
    expect(keys.size).toBe(fr.length)
  })
  it('average accepted degree is 50..130 and pending share 3..15%', () => {
    const accepted = fr.filter((f) => f.status === 'accepted')
    expect((accepted.length * 2) / users.length).toBeGreaterThan(50)
    expect((accepted.length * 2) / users.length).toBeLessThan(130)
    const pend = fr.length - accepted.length
    expect(pend / fr.length).toBeGreaterThan(0.03)
    expect(pend / fr.length).toBeLessThan(0.15)
    for (const f of accepted) expect(f.acceptedAt).not.toBeNull()
  })
  it('homophily: same-city share among friendships well above base rate', () => {
    const byId = new Map(users.map((u) => [u.id, u]))
    const same = fr.filter((f) => byId.get(f.lo)!.city === byId.get(f.hi)!.city).length / fr.length
    expect(same).toBeGreaterThan(0.4)
  })
  it('compound homophily: same city AND same dominant topic far above base rate', () => {
    // Random base rate is ~0.5%. The ceiling at this fixture is ~15.7%: 2000 users over 40 cities
    // x 12 topics allow only ~9.9k distinct city+topic pairs against ~63k edges, so the 55%
    // local branch runs out of unseen city+topic partners and degrades to same-city draws.
    expect(cityTopicShare(users, fr)).toBeGreaterThan(0.12)
  })
})

describe('generateFollows', () => {
  const { follows, memberships } = generateFollows(users, communities, rng.fork('follows'))
  it('unique, targets exist, ~45 per user, communities dominate', () => {
    const keys = new Set(follows.map((f) => `${f.followerId}:${f.targetType}:${f.targetId}`))
    expect(keys.size).toBe(follows.length)
    const perUser = follows.length / users.length
    expect(perUser).toBeGreaterThan(30)
    expect(perUser).toBeLessThan(70)
    const cShare = follows.filter((f) => f.targetType === 'community').length / follows.length
    expect(cShare).toBeGreaterThan(0.55)
    const cIds = new Set(communities.map((c) => c.id))
    const uIds = new Set(users.map((u) => u.id))
    for (const f of follows)
      expect(f.targetType === 'community' ? cIds.has(f.targetId) : uIds.has(f.targetId)).toBe(true)
    for (const f of follows)
      if (f.targetType === 'user') expect(users[f.targetId - 1]!.tier).not.toBe('regular')
  })
  it('memberships mirror community follows, each community has exactly one admin', () => {
    expect(memberships.length).toBe(follows.filter((f) => f.targetType === 'community').length)
    for (const c of communities)
      expect(memberships.filter((m) => m.communityId === c.id && m.role === 'admin').length).toBe(1)
  })
  it('community follows follow the interests of the follower', () => {
    // Random base rate is ~25% (users hold ~3 of 12 topics). The ceiling here is ~65%: a user
    // draws ~27 distinct communities while his interest topics only hold ~17 of the 70, so the
    // rest necessarily comes from the global fallback. See the scale-0.2 block below.
    expect(interestMatchShare(users, communities, follows)).toBeGreaterThan(0.5)
  })
  it('stars get more followers than notables (only ~4 stars exist here, so they saturate)', () => {
    const count = new Map<number, number>()
    for (const f of follows)
      if (f.targetType === 'user') count.set(f.targetId, (count.get(f.targetId) ?? 0) + 1)
    const avg = (tier: string) => {
      const xs = users.filter((u) => u.tier === tier).map((u) => count.get(u.id) ?? 0)
      return xs.reduce((a, b) => a + b, 0) / xs.length
    }
    expect(avg('star')).toBeGreaterThan(avg('notable') * 2)
  })
})

describe('interest and city homophily at a non-degenerate scale', () => {
  const big = { seed: 7, scale: 0.2, days: 90 }
  const brng = new Rng(big.seed)
  const bUsers = generateUsers(big, brng.fork('users'))
  const bCommunities = generateCommunities(big, brng.fork('communities'), CORPUS)
  it('community follows are interest-gated once the catalogue is not saturated', () => {
    const { follows } = generateFollows(bUsers, bCommunities, brng.fork('follows'))
    expect(interestMatchShare(bUsers, bCommunities, follows)).toBeGreaterThan(0.75)
  })
  it('friendships combine city and dominant-topic homophily', () => {
    const fr = generateFriendships(bUsers, brng.fork('friends'))
    expect(cityTopicShare(bUsers, fr)).toBeGreaterThan(0.25)
  })
  it('stars get far more followers than notables once the population is large enough not to saturate', () => {
    const { follows } = generateFollows(bUsers, bCommunities, brng.fork('follows'))
    const count = new Map<number, number>()
    for (const f of follows)
      if (f.targetType === 'user') count.set(f.targetId, (count.get(f.targetId) ?? 0) + 1)
    const avg = (tier: string) => {
      const xs = bUsers.filter((u) => u.tier === tier).map((u) => count.get(u.id) ?? 0)
      return xs.reduce((a, b) => a + b, 0) / xs.length
    }
    expect(avg('star')).toBeGreaterThan(avg('notable') * 5)
  })
})

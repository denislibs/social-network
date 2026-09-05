import { describe, expect, it } from 'bun:test'
import { CORPUS } from '../corpus'
import { Rng } from '../rng'
import { generateCommunities } from './communities'
import { generateFollows, generateFriendships } from './graph'
import { generateUsers } from './users'

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
  it('stars get far more followers than notables', () => {
    const count = new Map<number, number>()
    for (const f of follows)
      if (f.targetType === 'user') count.set(f.targetId, (count.get(f.targetId) ?? 0) + 1)
    const avg = (tier: string) => {
      const xs = users.filter((u) => u.tier === tier).map((u) => count.get(u.id) ?? 0)
      return xs.reduce((a, b) => a + b, 0) / xs.length
    }
    expect(avg('star')).toBeGreaterThan(avg('notable') * 5)
  })
})

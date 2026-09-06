import { describe, expect, it } from 'bun:test'
import { CORPUS } from '../corpus'
import { Rng } from '../rng'
import { generateCommunities } from './communities'
import { buildDemoGraph } from './demo'
import { generateUsers } from './users'

const cfg = { seed: 7, scale: 0.04, days: 90 }

function build() {
  const rng = new Rng(cfg.seed)
  const users = generateUsers(cfg, rng.fork('users'))
  const communities = generateCommunities(cfg, rng.fork('communities'), CORPUS)
  const graph = buildDemoGraph(users, communities, rng.fork('demo'))
  return { users, communities, graph }
}

describe('buildDemoGraph', () => {
  const { users, graph } = build()
  const { demo, denis, friendships, follows, memberships } = graph

  it('assigns ids right after the generated population', () => {
    expect(demo.id).toBe(users.length + 1)
    expect(denis.id).toBe(users.length + 2)
    expect(demo.login).toBe('demo')
    expect(denis.login).toBe('deniscoreablev')
    expect(demo.city).toBe('Москва')
  })

  const demoFriendships = friendships.filter((f) => f.lo === demo.id || f.hi === demo.id)

  it('demo has exactly 30 accepted friendships', () => {
    const accepted = demoFriendships.filter((f) => f.status === 'accepted')
    expect(accepted.length).toBe(30)
    for (const f of accepted) expect(f.acceptedAt).not.toBeNull()
  })

  it('demo has exactly 5 incoming pending requests, each mirrored by a follow from the requester', () => {
    const incoming = demoFriendships.filter(
      (f) => f.status === 'pending' && f.requesterId !== demo.id,
    )
    expect(incoming.length).toBe(5)
    for (const f of incoming) {
      const other = f.requesterId
      expect(
        follows.some(
          (fo) => fo.followerId === other && fo.targetType === 'user' && fo.targetId === demo.id,
        ),
      ).toBe(true)
    }
  })

  it('demo has exactly 3 outgoing pending requests, each mirrored by a follow from demo', () => {
    const outgoing = demoFriendships.filter(
      (f) => f.status === 'pending' && f.requesterId === demo.id,
    )
    expect(outgoing.length).toBe(3)
    for (const f of outgoing) {
      const other = f.lo === demo.id ? f.hi : f.lo
      expect(
        follows.some(
          (fo) => fo.followerId === demo.id && fo.targetType === 'user' && fo.targetId === other,
        ),
      ).toBe(true)
    }
  })

  it('every demo friendship pair is distinct (no user appears in two buckets)', () => {
    const others = demoFriendships.map((f) => (f.lo === demo.id ? f.hi : f.lo))
    expect(new Set(others).size).toBe(others.length)
  })

  it('demo is a member of exactly 4 communities, mirrored by follows', () => {
    const demoMemberships = memberships.filter((m) => m.userId === demo.id)
    expect(demoMemberships.length).toBe(4)
    for (const m of demoMemberships)
      expect(
        follows.some(
          (fo) =>
            fo.followerId === demo.id &&
            fo.targetType === 'community' &&
            fo.targetId === m.communityId,
        ),
      ).toBe(true)
  })

  it('denis keeps the historical hand-tuned network (accepted friendships only, up to 80 friends and 15 communities)', () => {
    const denisFriendships = friendships.filter((f) => f.lo === denis.id || f.hi === denis.id)
    expect(denisFriendships.length).toBeGreaterThan(0)
    expect(denisFriendships.length).toBeLessThanOrEqual(80)
    for (const f of denisFriendships) expect(f.status).toBe('accepted')
    const denisMemberships = memberships.filter((m) => m.userId === denis.id)
    expect(denisMemberships.length).toBeGreaterThan(0)
    expect(denisMemberships.length).toBeLessThanOrEqual(15)
  })

  it('is deterministic: same users/communities/seed produce identical rows', () => {
    const again = build()
    expect(again.graph.demo).toEqual(demo)
    expect(again.graph.denis).toEqual(denis)
    expect(again.graph.friendships).toEqual(friendships)
    expect(again.graph.follows).toEqual(follows)
    expect(again.graph.memberships).toEqual(memberships)
  })

  it('throws a clear error instead of silently under-filling when the Moscow pool is too small', () => {
    const rng = new Rng(1)
    const tinyUsers = generateUsers({ seed: 1, scale: 0.001, days: 90 }, rng.fork('users')).map(
      (u) => ({
        ...u,
        city: 'Москва',
        tier: 'star' as const, // every candidate excluded from the "regular" pool
      }),
    )
    const communities = generateCommunities(
      { seed: 1, scale: 0.001, days: 90 },
      rng.fork('communities'),
      CORPUS,
    )
    expect(() => buildDemoGraph(tinyUsers, communities, rng.fork('demo'))).toThrow(/need 38/)
  })
})

import { describe, expect, it } from 'bun:test'
import { CORPUS } from '../corpus'
import { Rng } from '../rng'
import { TOPICS } from '../topics'
import { generateCommunities } from './communities'
import { simulateEvents } from './events'
import { generateFollows, generateFriendships } from './graph'
import { generatePosts } from './posts'
import { generateUsers } from './users'

const cfg = { seed: 5, scale: 0.02, days: 30 }
const rng = new Rng(5)
const users = generateUsers(cfg, rng.fork('users'))
const communities = generateCommunities(cfg, rng.fork('communities'), CORPUS)
const friendships = generateFriendships(users, rng.fork('friends'))
const { follows } = generateFollows(users, communities, rng.fork('follows'))
const posts = generatePosts(cfg, users, communities, CORPUS, rng.fork('posts'))

const TOPIC_INDEX = (t: string) => TOPICS.indexOf(t as (typeof TOPICS)[number])
const views = (es: { kind: string }[]) => es.filter((e) => e.kind === 'view').length

describe('simulateEvents', () => {
  const { events, likes, comments } = simulateEvents(
    cfg,
    users,
    posts,
    { follows, friendships },
    CORPUS,
    rng.fork('events'),
    { activeShare: 0.3, sessions: 10, impressions: 20 },
  )
  const viewed = new Set(
    events.filter((e) => e.kind === 'view').map((e) => `${e.userId}:${e.postId}:${e.sessionId}`),
  )
  it('every like/click/comment has a view in the same session; sources and positions valid', () => {
    for (const e of events) {
      if (e.kind !== 'view') expect(viewed.has(`${e.userId}:${e.postId}:${e.sessionId}`)).toBe(true)
      expect(['friends', 'follows', 'communities', 'popular']).toContain(e.source)
      expect(e.position).toBeGreaterThanOrEqual(0)
      expect(e.position).toBeLessThan(20)
    }
  })
  it('rates are plausible: view 35..80% of impressions, like 3..20% of views', () => {
    const active = Math.round(users.length * 0.3)
    const impressions = active * 10 * 20
    const views = events.filter((e) => e.kind === 'view').length
    expect(views / impressions).toBeGreaterThan(0.35)
    expect(views / impressions).toBeLessThan(0.8)
    expect(likes.length / views).toBeGreaterThan(0.03)
    expect(likes.length / views).toBeLessThan(0.2)
    expect(comments.length).toBeGreaterThan(0)
  })
  it('likes are unique per (user,post) and interest-aligned', () => {
    expect(new Set(likes.map((l) => `${l.userId}:${l.postId}`)).size).toBe(likes.length)
    const avgMatchLiked =
      likes.reduce(
        (a, l) => a + users[l.userId - 1]!.interests[TOPIC_INDEX(posts[l.postId - 1]!.topic)]!,
        0,
      ) / likes.length
    const avgMatchViewed =
      events
        .filter((e) => e.kind === 'view')
        .reduce(
          (a, e) => a + users[e.userId - 1]!.interests[TOPIC_INDEX(posts[e.postId - 1]!.topic)]!,
          0,
        ) / views(events)
    expect(avgMatchLiked).toBeGreaterThan(avgMatchViewed * 1.15)
  })
})

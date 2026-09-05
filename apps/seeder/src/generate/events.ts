import type { TopicCorpus } from '../corpus/schema'
import type { Rng } from '../rng'
import { TOPICS, type Topic } from '../topics'
import type { Follow, Friendship } from './graph'
import type { SeedPost } from './posts'
import type { SeedConfig, SeedUser } from './types'
import { SEED_NOW } from './types'

export type EventSource = 'friends' | 'follows' | 'communities' | 'popular'
export type SeedEvent = {
  userId: number
  postId: number
  kind: 'view' | 'like' | 'comment' | 'click'
  source: EventSource
  position: number
  sessionId: number
  createdAt: Date
}
export type SeedLike = { userId: number; postId: number; createdAt: Date }
export type SeedComment = { postId: number; authorId: number; text: string; createdAt: Date }
export type SimOpts = { activeShare: number; sessions: number; impressions: number }

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))
const authorKey = (t: 'user' | 'community', id: number) => (t === 'user' ? id : -id)

function lowerBound(arr: SeedPost[], t: number): number {
  let lo = 0
  let hi = arr.length
  while (lo < hi) {
    const m = (lo + hi) >> 1
    if (arr[m]!.createdAt.getTime() < t) lo = m + 1
    else hi = m
  }
  return lo
}

export function simulateEvents(
  cfg: SeedConfig,
  users: SeedUser[],
  posts: SeedPost[],
  graph: { follows: Follow[]; friendships: Friendship[] },
  corpus: Record<Topic, TopicCorpus>,
  rng: Rng,
  opts: SimOpts = { activeShare: 0.3, sessions: 30, impressions: 20 },
): { events: SeedEvent[]; likes: SeedLike[]; comments: SeedComment[] } {
  // posts are already sorted by createdAt (see generatePosts); byAuthor lists preserve that order.
  const byAuthor = new Map<number, SeedPost[]>()
  for (const p of posts) {
    const k = authorKey(p.authorType, p.authorId)
    const l = byAuthor.get(k)
    if (l) l.push(p)
    else byAuthor.set(k, [p])
  }
  // Audience model: `followers` merges follow edges and accepted friendships into one count per
  // author, because a user's content reaches both the people who follow them AND their accepted
  // friends. This same map feeds the `pop` regression term below and the top-5% "popular" pool,
  // so both use the same "who actually sees this author's posts" definition.
  const followers = new Map<number, number>()
  for (const f of graph.follows) {
    const k = authorKey(f.targetType, f.targetId)
    followers.set(k, (followers.get(k) ?? 0) + 1)
  }
  for (const f of graph.friendships) {
    if (f.status === 'accepted') {
      followers.set(f.lo, (followers.get(f.lo) ?? 0) + 1)
      followers.set(f.hi, (followers.get(f.hi) ?? 0) + 1)
    }
  }
  const sourcesByUser = new Map<number, { key: number; source: EventSource }[]>()
  const add = (u: number, key: number, source: EventSource) => {
    const l = sourcesByUser.get(u)
    const e = { key, source }
    if (l) l.push(e)
    else sourcesByUser.set(u, [e])
  }
  for (const f of graph.follows)
    add(
      f.followerId,
      authorKey(f.targetType, f.targetId),
      f.targetType === 'community' ? 'communities' : 'follows',
    )
  for (const f of graph.friendships) {
    if (f.status === 'accepted') {
      add(f.lo, f.hi, 'friends')
      add(f.hi, f.lo, 'friends')
    }
  }
  const popularAuthors = [...followers.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(5, Math.floor(followers.size * 0.05)))
    .map(([k]) => k)

  const now = SEED_NOW
  const start = now - cfg.days * 86400_000
  const WINDOW = 72 * 3600_000
  const events: SeedEvent[] = []
  const likes: SeedLike[] = []
  const comments: SeedComment[] = []
  const liked = new Set<string>()
  const active = users.filter(() => rng.chance(opts.activeShare))
  let sessionId = 0
  const pickIn = (key: number, t: number): SeedPost | null => {
    const list = byAuthor.get(key)
    if (!list) return null
    const hi = lowerBound(list, t)
    const lo = lowerBound(list, t - WINDOW)
    return hi > lo ? list[rng.int(lo, hi - 1)]! : null
  }
  for (const u of active) {
    const subs = sourcesByUser.get(u.id) ?? []
    for (let s = 0; s < opts.sessions; s++) {
      sessionId++
      const t = start + WINDOW + rng.next() * (cfg.days * 86400_000 - WINDOW)
      const seen = new Set<number>()
      for (let pos = 0; pos < opts.impressions; pos++) {
        let post: SeedPost | null = null
        let source: EventSource = 'popular'
        for (let tries = 0; tries < 4 && !post; tries++) {
          if (rng.chance(0.8) && subs.length) {
            const sub = rng.pick(subs)
            post = pickIn(sub.key, t)
            source = sub.source
          } else {
            post = pickIn(rng.pick(popularAuthors), t)
            source = 'popular'
          }
        }
        if (!post || seen.has(post.id)) continue
        seen.add(post.id)
        const match = u.interests[TOPICS.indexOf(post.topic)]!
        const pop = Math.log1p(followers.get(authorKey(post.authorType, post.authorId)) ?? 0)
        const age = (t - post.createdAt.getTime()) / 3600_000
        if (!rng.chance(sigmoid(2.2 * match + 0.15 * pop - 0.02 * age + 0.3 * rng.gauss() - 0.8)))
          continue
        const at = new Date(t + pos * 4000)
        const postId = post.id
        events.push({
          userId: u.id,
          postId,
          kind: 'view',
          source,
          position: pos,
          sessionId,
          createdAt: at,
        })
        if (rng.chance(0.3 + 0.3 * match)) {
          events.push({
            userId: u.id,
            postId,
            kind: 'click',
            source,
            position: pos,
            sessionId,
            createdAt: at,
          })
        }
        if (
          rng.chance(sigmoid(3.5 * match + 0.15 * pop - 0.01 * age + 0.4 * rng.gauss() - 4.2)) &&
          !liked.has(`${u.id}:${postId}`)
        ) {
          liked.add(`${u.id}:${postId}`)
          likes.push({ userId: u.id, postId, createdAt: at })
          events.push({
            userId: u.id,
            postId,
            kind: 'like',
            source,
            position: pos,
            sessionId,
            createdAt: at,
          })
          if (rng.chance(0.12)) {
            comments.push({
              postId,
              authorId: u.id,
              text: rng.pick(corpus[post.topic]!.comments),
              createdAt: new Date(at.getTime() + 30_000),
            })
            events.push({
              userId: u.id,
              postId,
              kind: 'comment',
              source,
              position: pos,
              sessionId,
              createdAt: at,
            })
          }
        }
      }
    }
  }
  return { events, likes, comments }
}

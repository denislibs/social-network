import type { TopicCorpus } from '../corpus/schema'
import { cumulative, type Rng } from '../rng'
import { TOPICS, type Topic } from '../topics'
import { generatePost, type TextVars } from './text'
import type { SeedCommunity, SeedConfig, SeedUser } from './types'
import { SEED_NOW } from './types'
import { CITIES } from './users'

export type SeedPost = {
  id: number
  authorType: 'user' | 'community'
  authorId: number
  topic: Topic
  text: string
  hasPhoto: boolean
  createdAt: Date
}

function poisson(rng: Rng, lambda: number): number {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng.next()
  } while (p > L)
  return k - 1
}

export function generatePosts(
  cfg: SeedConfig,
  users: SeedUser[],
  communities: SeedCommunity[],
  corpus: Record<Topic, TopicCorpus>,
  rng: Rng,
): SeedPost[] {
  const now = SEED_NOW
  const start = now - cfg.days * 86400_000
  const raw: Omit<SeedPost, 'id'>[] = []
  const vars = (): TextVars => ({
    name: rng.pick(users).firstName,
    city: rng.pick(CITIES),
    year: rng.int(1995, 2026),
    n: rng.int(2, 40),
  })
  const maxPop = Math.max(...communities.map((c) => c.popularity))
  for (const c of communities) {
    const lambda = 1 + 4 * (c.popularity / maxPop)
    for (let d = 0; d < cfg.days; d++) {
      for (let i = poisson(rng, lambda); i > 0; i--) {
        const t = start + (d + rng.next()) * 86400_000
        raw.push({
          authorType: 'community',
          authorId: c.id,
          topic: c.topic,
          text: generatePost(rng.pick(corpus[c.topic]!.posts), corpus[c.topic]!, rng, vars()),
          hasPhoto: rng.chance(0.45),
          createdAt: new Date(t),
        })
      }
    }
  }
  for (const u of users) {
    const perDay =
      u.tier === 'star'
        ? 1 / rng.int(1, 3)
        : u.tier === 'notable'
          ? 0.2
          : rng.chance(0.05)
            ? 1 / 7
            : 0
    if (!perDay) continue
    const cum = cumulative(u.interests)
    const n = poisson(rng, perDay * cfg.days)
    for (let i = 0; i < n; i++) {
      const topic = TOPICS[rng.weightedIndex(cum)]!
      raw.push({
        authorType: 'user',
        authorId: u.id,
        topic,
        text: generatePost(rng.pick(corpus[topic]!.personalPosts), corpus[topic]!, rng, {
          name: u.firstName,
          city: u.city,
          year: rng.int(2005, 2026),
          n: rng.int(2, 40),
        }),
        hasPhoto: rng.chance(0.5),
        createdAt: new Date(start + rng.next() * cfg.days * 86400_000),
      })
    }
  }
  raw.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  return raw.map((p, i) => ({ id: i + 1, ...p }))
}

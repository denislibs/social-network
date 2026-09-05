import type { TopicCorpus } from '../corpus/schema'
import type { Rng } from '../rng'
import { TOPICS, type Topic } from '../topics'
import type { SeedCommunity, SeedConfig } from './types'
import { SEED_NOW } from './types'
import { scaleCount, translit } from './users'

export function generateCommunities(
  cfg: SeedConfig,
  rng: Rng,
  corpus: Record<Topic, TopicCorpus>,
): SeedCommunity[] {
  // Floor of 70 (≈6 per topic) instead of 24: below scale 0.1 a 24-community catalogue leaves
  // 2 communities per topic, which makes interest-gated follows degenerate (a user exhausts the
  // communities of his own interests after a handful of follows). 70 keeps scale 0.1 → 70 and
  // scale 1 → 700 unchanged.
  const total = scaleCount(700, cfg.scale, 70)
  // Round-robin quota: every topic gets floor(total/12), the first (total % 12) topics get one
  // extra. A per-topic ceil() with an early exit at `total` starved the last topics in TOPICS
  // order (fashion, city got 0 communities at scale 0.04), which left interest-gated follows
  // with dead topics.
  const base = Math.floor(total / TOPICS.length)
  const extra = total % TOPICS.length
  const out: SeedCommunity[] = []
  const usedScreen = new Set<string>()
  for (const [ti, topic] of TOPICS.entries()) {
    const quota = base + (ti < extra ? 1 : 0)
    const pool = rng.shuffle([...corpus[topic].communities]).slice(0, quota)
    pool.forEach((c, i) => {
      let screen = `club${translit(c.name).slice(0, 24) || topic}`
      while (usedScreen.has(screen)) screen = `${screen}${rng.int(1, 999)}`
      usedScreen.add(screen)
      out.push({
        id: out.length + 1,
        screenName: screen,
        name: c.name,
        description: c.description,
        topic,
        popularity: 1 / (i + 1) ** 0.9,
        createdAt: new Date(SEED_NOW - rng.next() * 6 * 365 * 86_400_000),
      })
    })
  }
  return out
}

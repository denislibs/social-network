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
  const total = scaleCount(700, cfg.scale, 24)
  const perTopic = Math.ceil(total / TOPICS.length)
  const out: SeedCommunity[] = []
  const usedScreen = new Set<string>()
  for (const topic of TOPICS) {
    const pool = rng.shuffle([...corpus[topic].communities]).slice(0, perTopic)
    pool.forEach((c, i) => {
      if (out.length >= total) return
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

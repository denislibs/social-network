import type { TopicCorpus } from '../corpus/schema'
import type { Rng } from '../rng'
export type TextVars = { name: string; city: string; year: number; n: number }

export function generatePost(base: string, c: TopicCorpus, rng: Rng, vars: TextVars): string {
  let text = base
    .replaceAll('{name}', vars.name)
    .replaceAll('{city}', vars.city)
    .replaceAll('{year}', String(vars.year))
    .replaceAll('{n}', String(vars.n))
  text = text.replace(/\b(\d{2,4})\b/g, (m) =>
    rng.chance(0.5) ? String(Math.max(1, Math.round(Number(m) * (0.9 + rng.next() * 0.2)))) : m,
  )
  if (rng.chance(0.35)) text = `${rng.pick(c.openers)} ${text}`
  if (rng.chance(0.35)) text = `${text}\n\n${rng.pick(c.closers)}`
  if (rng.chance(0.6)) {
    const k = rng.int(1, 3)
    const tags = rng.shuffle([...c.hashtags]).slice(0, k)
    text = `${text}\n\n${tags.join(' ')}`
  }
  return text
}
export function pickComment(c: TopicCorpus, rng: Rng): string {
  return rng.pick(c.comments)
}

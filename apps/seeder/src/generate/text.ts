import type { TopicCorpus } from '../corpus/schema'
import type { Rng } from '../rng'
export type TextVars = { name: string; city: string; year: number; n: number }

export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n)
  const mod10 = abs % 10
  const mod100 = abs % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export function generatePost(base: string, c: TopicCorpus, rng: Rng, vars: TextVars): string {
  // Jitter literal numbers first: doing it after substitution would break the
  // agreement between {n:...} and the noun form chosen for it.
  let text = base
    .replace(/\b(\d{2,4})\b/g, (m) =>
      rng.chance(0.5) ? String(Math.max(1, Math.round(Number(m) * (0.9 + rng.next() * 0.2)))) : m,
    )
    .replaceAll('{name}', vars.name)
    .replaceAll('{city}', vars.city)
    .replaceAll('{year}', String(vars.year))
    .replace(
      /\{n:([^|}]+)\|([^|}]+)\|([^}]+)\}/g,
      (_, a: string, b: string, c: string) => `${vars.n} ${plural(vars.n, a, b, c)}`,
    )
    .replaceAll('{n}', String(vars.n))
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

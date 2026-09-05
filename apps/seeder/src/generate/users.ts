import { fakerRU } from '@faker-js/faker'
import { cumulative, type Rng } from '../rng'
import { TOPICS } from '../topics'
import { CITIES } from './cities'
import type { SeedConfig, SeedUser, Tier } from './types'
import { SEED_NOW } from './types'

export { CITIES } from './cities'

export function scaleCount(base: number, scale: number, min = 1): number {
  return Math.max(min, Math.round(base * scale))
}

const TRANSLIT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}
export function translit(s: string): string {
  return s
    .toLowerCase()
    .split('')
    .map((ch) => TRANSLIT[ch] ?? (/[a-z0-9]/.test(ch) ? ch : ''))
    .join('')
}

const STATUSES = [
  'Глажу кота',
  'на связи после 19:00',
  'в поиске хорошего кофе',
  'не пишите, звоните',
  'учу питон, уже не первый год',
  'всё будет',
  'работаю, не мешать',
  'ищу барабанщика',
  'на даче до понедельника',
  'читаю больше, чем пишу',
]

export function generateUsers(cfg: SeedConfig, rng: Rng): SeedUser[] {
  const N = scaleCount(50_000, cfg.scale, 200)
  const stars = scaleCount(100, cfg.scale, 3)
  const notable = scaleCount(1500, cfg.scale, 10)
  fakerRU.seed(cfg.seed)
  const cityCum = cumulative(CITIES.map((_, i) => 1 / (i + 1) ** 0.8))
  const ranks = rng.shuffle(Array.from({ length: N }, (_, i) => i + 1))
  const used = new Set<string>()
  const refDate = new Date(SEED_NOW)
  const out: SeedUser[] = []
  for (let i = 0; i < N; i++) {
    const sex: 'male' | 'female' = rng.chance(0.5) ? 'male' : 'female'
    const firstName = fakerRU.person.firstName(sex)
    const lastName = fakerRU.person.lastName(sex)
    let login = `${translit(firstName)}.${translit(lastName)}`.replace(/\.+/g, '.').slice(0, 28)
    login = login.replace(/^\.+|\.+$/g, '')
    if (login.length < 3) login = `user${i + 1}`
    if (used.has(login)) login = `${login}${rng.int(10, 9999)}`
    while (used.has(login)) login = `${login.replace(/\d+$/, '').slice(0, 27)}${rng.int(10, 99999)}`
    used.add(login)
    const tier: Tier = i < stars ? 'star' : i < notable + stars ? 'notable' : 'regular'
    const rank =
      tier === 'star'
        ? i + 1
        : tier === 'notable'
          ? stars + 1 + (ranks[i]! % notable)
          : stars + notable + 1 + (ranks[i]! % Math.max(1, N - stars - notable)) * 3
    const k = rng.int(2, 4)
    const idx = rng.shuffle([...TOPICS.keys()]).slice(0, k)
    const interests = new Float32Array(TOPICS.length)
    let sum = 0
    for (const j of idx) {
      const w = Math.abs(rng.gauss(1, 0.5)) + 0.1
      interests[j] = w
      sum += w
    }
    for (const j of idx) interests[j] = interests[j]! / sum
    const birth = fakerRU.date.birthdate({ min: 16, max: 60, mode: 'age', refDate })
    out.push({
      id: i + 1,
      login,
      firstName,
      lastName,
      screenName: rng.chance(0.3) ? login.replaceAll('.', '_') : null,
      city: CITIES[rng.weightedIndex(cityCum)]!,
      birthday: birth.toISOString().slice(0, 10),
      sex,
      interests,
      tier,
      popularity: 1 / rank ** 0.9,
      createdAt: new Date(SEED_NOW - rng.next() * 5 * 365 * 86_400_000),
      status: rng.chance(0.25) ? rng.pick(STATUSES) : null,
    })
  }
  return out
}

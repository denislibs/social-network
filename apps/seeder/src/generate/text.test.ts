import { describe, expect, it } from 'bun:test'
import { cinema } from '../corpus/topics/cinema'
import { Rng } from '../rng'
import { generatePost, plural, type TextVars } from './text'

const vars: TextVars = { name: 'Денис', city: 'Казань', year: 2019, n: 14 }
describe('generatePost', () => {
  it('substitutes placeholders', () => {
    const out = generatePost(
      'В {city} в {year} году показали {n} фильмов, сказал {name}.',
      cinema,
      new Rng(1),
      vars,
    )
    expect(out).not.toMatch(/\{(name|city|year|n)\}/)
    expect(out).not.toMatch(/\{n[:}]/)
    expect(out).toContain('Казань')
  })
  it('declines nouns after {n:one|few|many}', () => {
    const tpl = 'снято за {n:день|дня|дней}'
    expect(generatePost(tpl, cinema, new Rng(1), { ...vars, n: 1 })).toContain('1 день')
    expect(generatePost(tpl, cinema, new Rng(1), { ...vars, n: 3 })).toContain('3 дня')
    expect(generatePost(tpl, cinema, new Rng(1), { ...vars, n: 14 })).toContain('14 дней')
    expect(generatePost(tpl, cinema, new Rng(1), { ...vars, n: 21 })).toContain('21 день')
  })
  it('keeps the declined noun in agreement with the substituted number', () => {
    const tpl = 'осталось {n:билет|билета|билетов}'
    for (let seed = 0; seed < 40; seed++) {
      for (const n of [12, 22, 33, 45, 101]) {
        const out = generatePost(tpl, cinema, new Rng(seed), { ...vars, n })
        expect(out).toContain(`${n} ${plural(n, 'билет', 'билета', 'билетов')}`)
      }
    }
  })
  it('is deterministic and produces variety across seeds', () => {
    const base = cinema.posts[0]!
    const a = generatePost(base, cinema, new Rng(7), vars)
    expect(generatePost(base, cinema, new Rng(7), vars)).toBe(a)
    const variants = new Set(
      Array.from({ length: 30 }, (_, i) => generatePost(base, cinema, new Rng(i), vars)),
    )
    expect(variants.size).toBeGreaterThan(10)
  })
  it('keeps the base text inside the result', () => {
    const base = 'Просто текст без чисел и плейсхолдеров.'
    const out = generatePost(base, cinema, new Rng(3), vars)
    expect(out).toContain(base)
  })
})

import { describe, expect, it } from 'bun:test'
import { cinema } from '../corpus/topics/cinema'
import { Rng } from '../rng'
import { generatePost, type TextVars } from './text'

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
    expect(out).toContain('Казань')
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

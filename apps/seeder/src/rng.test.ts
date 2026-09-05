import { describe, expect, it } from 'bun:test'
import { Rng } from './rng'

describe('Rng', () => {
  it('is deterministic per seed and differs across seeds', () => {
    const a = new Rng(1),
      b = new Rng(1),
      c = new Rng(2)
    const sa = Array.from({ length: 5 }, () => a.next())
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(sa)
    expect(c.next()).not.toBe(sa[0])
  })
  it('int is inclusive and within range', () => {
    const r = new Rng(3)
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) {
      const v = r.int(1, 3)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(3)
      seen.add(v)
    }
    expect(seen.size).toBe(3)
  })
  it('gauss has roughly right mean/sd, lognormal is positive', () => {
    const r = new Rng(4)
    const xs = Array.from({ length: 20000 }, () => r.gauss(10, 2))
    const mean = xs.reduce((a, b) => a + b) / xs.length
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length)
    expect(Math.abs(mean - 10)).toBeLessThan(0.1)
    expect(Math.abs(sd - 2)).toBeLessThan(0.1)
    for (let i = 0; i < 100; i++) expect(r.lognormal(0, 1)).toBeGreaterThan(0)
  })
  it('weightedIndex follows cumulative weights', () => {
    const r = new Rng(5)
    const cum = new Float64Array([0.1, 0.4, 1.0])
    const counts = [0, 0, 0]
    for (let i = 0; i < 10000; i++) counts[r.weightedIndex(cum)]!++
    expect(counts[2]! / 10000).toBeGreaterThan(0.55)
    expect(counts[0]! / 10000).toBeLessThan(0.14)
  })
  it('fork gives independent stable streams', () => {
    expect(new Rng(9).fork('users').next()).toBe(new Rng(9).fork('users').next())
    expect(new Rng(9).fork('users').next()).not.toBe(new Rng(9).fork('posts').next())
  })
})

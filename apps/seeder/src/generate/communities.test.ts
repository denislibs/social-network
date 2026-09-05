import { describe, expect, it } from 'bun:test'
import { CORPUS } from '../corpus'
import { Rng } from '../rng'
import { generateCommunities } from './communities'

describe('generateCommunities', () => {
  const cs = generateCommunities({ seed: 1, scale: 0.1, days: 90 }, new Rng(1), CORPUS)
  it('count scales, names/screenNames unique, every topic present', () => {
    expect(cs.length).toBe(70)
    expect(new Set(cs.map((c) => c.name)).size).toBe(70)
    expect(new Set(cs.map((c) => c.screenName)).size).toBe(70)
    expect(new Set(cs.map((c) => c.topic)).size).toBe(12)
    for (const c of cs) expect(c.screenName).toMatch(/^club[a-z0-9_]+$/)
  })
  it('full scale fits in corpus without repeats', () => {
    const all = generateCommunities({ seed: 1, scale: 1, days: 90 }, new Rng(1), CORPUS)
    expect(all.length).toBe(700)
    expect(new Set(all.map((c) => c.name)).size).toBe(700)
  })
})

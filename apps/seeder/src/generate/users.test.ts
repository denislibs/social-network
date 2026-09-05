import { describe, expect, it } from 'bun:test'
import { Rng } from '../rng'
import { generateUsers, scaleCount } from './users'

const cfg = { seed: 42, scale: 0.02, days: 90 }
describe('generateUsers', () => {
  const users = generateUsers(cfg, new Rng(cfg.seed))
  it('scales count and tiers', () => {
    expect(users.length).toBe(1000)
    expect(users.filter((u) => u.tier === 'star').length).toBe(3)
    expect(users.filter((u) => u.tier === 'notable').length).toBe(30)
    expect(scaleCount(50_000, 1)).toBe(50_000)
    expect(scaleCount(100, 0.001, 3)).toBe(3)
  })
  it('ids are 1..N, logins unique and lowercase latin', () => {
    expect(users.map((u) => u.id)).toEqual(Array.from({ length: 1000 }, (_, i) => i + 1))
    expect(new Set(users.map((u) => u.login)).size).toBe(1000)
    for (const u of users) expect(u.login).toMatch(/^[a-z0-9_.]{3,32}$/)
  })
  it('interests sum to 1 with 2..4 non-zero topics', () => {
    for (const u of users.slice(0, 200)) {
      const nz = [...u.interests].filter((w) => w > 0).length
      expect(nz).toBeGreaterThanOrEqual(2)
      expect(nz).toBeLessThanOrEqual(4)
      expect(Math.abs([...u.interests].reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-4)
    }
  })
  it('popularity is heavy-tailed: top-1 star ≫ median regular', () => {
    const star = Math.max(...users.filter((u) => u.tier === 'star').map((u) => u.popularity))
    const regular = users
      .filter((u) => u.tier === 'regular')
      .map((u) => u.popularity)
      .sort((a, b) => a - b)
    expect(star / regular[Math.floor(regular.length / 2)]!).toBeGreaterThan(100)
  })
  it('is deterministic', () => {
    expect(generateUsers(cfg, new Rng(cfg.seed))[17]).toEqual(users[17])
  })
})

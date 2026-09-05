import { describe, expect, it } from 'bun:test'
import { CORPUS } from '../corpus'
import { Rng } from '../rng'
import { generateCommunities } from './communities'
import { generatePosts } from './posts'
import { SEED_NOW } from './types'
import { generateUsers } from './users'

const cfg = { seed: 3, scale: 0.02, days: 30 }
const rng = new Rng(3)
const users = generateUsers(cfg, rng.fork('users'))
const communities = generateCommunities(cfg, rng.fork('communities'), CORPUS)

describe('generatePosts', () => {
  const posts = generatePosts(cfg, users, communities, CORPUS, rng.fork('posts'))
  it('is sorted by time with sequential ids inside the window', () => {
    const now = SEED_NOW
    for (let i = 0; i < posts.length; i++) {
      expect(posts[i]!.id).toBe(i + 1)
      if (i)
        expect(posts[i]!.createdAt.getTime()).toBeGreaterThanOrEqual(
          posts[i - 1]!.createdAt.getTime(),
        )
      expect(now - posts[i]!.createdAt.getTime()).toBeLessThanOrEqual(cfg.days * 86400_000 + 1000)
    }
  })
  it('community posts dominate; posting rates are in expected ranges', () => {
    const c = posts.filter((p) => p.authorType === 'community').length
    const perCommunityPerDay = c / communities.length / cfg.days
    expect(perCommunityPerDay).toBeGreaterThan(0.8)
    expect(perCommunityPerDay).toBeLessThan(6)
    const starPosts =
      posts.filter((p) => p.authorType === 'user' && users[p.authorId - 1]!.tier === 'star')
        .length / users.filter((u) => u.tier === 'star').length
    expect(starPosts).toBeGreaterThan(cfg.days / 4)
    expect(starPosts).toBeLessThan(cfg.days * 1.2)
  })
  it('community post topic equals community topic; text is non-empty and varied', () => {
    for (const p of posts.filter((p) => p.authorType === 'community').slice(0, 300))
      expect(p.topic).toBe(communities[p.authorId - 1]!.topic)
    expect(new Set(posts.map((p) => p.text)).size / posts.length).toBeGreaterThan(0.7)
  })
})

import { describe, expect, it } from 'bun:test'
import { TOPICS } from '../topics'
import { CORPUS, DIALOG_LINES } from './index'
import { CORPUS_MIN } from './schema'

function assertUniqueNonEmpty(arr: string[], label: string) {
  expect(new Set(arr.map((s) => s.trim())).size, `${label} unique`).toBe(arr.length)
  for (const s of arr) expect(s.trim().length, `${label} non-empty`).toBeGreaterThan(0)
}

describe('corpus', () => {
  it.todo('covers every topic', () => {
    expect(Object.keys(CORPUS).sort()).toEqual([...TOPICS].sort())
  })
  for (const topic of TOPICS) {
    const c = CORPUS[topic]
    if (!c) continue
    describe(topic, () => {
      it('meets minimum sizes', () => {
        expect(c.communities.length).toBeGreaterThanOrEqual(CORPUS_MIN.communities)
        expect(c.posts.length).toBeGreaterThanOrEqual(CORPUS_MIN.posts)
        expect(c.personalPosts.length).toBeGreaterThanOrEqual(CORPUS_MIN.personalPosts)
        expect(c.comments.length).toBeGreaterThanOrEqual(CORPUS_MIN.comments)
        expect(c.openers.length).toBeGreaterThanOrEqual(CORPUS_MIN.openers)
        expect(c.closers.length).toBeGreaterThanOrEqual(CORPUS_MIN.closers)
        expect(c.hashtags.length).toBeGreaterThanOrEqual(CORPUS_MIN.hashtags)
      })
      it('strings are unique and non-empty, posts 40..1200 chars, hashtags well-formed', () => {
        assertUniqueNonEmpty(c.posts, 'posts')
        assertUniqueNonEmpty(c.personalPosts, 'personal')
        assertUniqueNonEmpty(c.comments, 'comments')
        assertUniqueNonEmpty(c.openers, 'openers')
        assertUniqueNonEmpty(c.closers, 'closers')
        assertUniqueNonEmpty(c.hashtags, 'hashtags')
        assertUniqueNonEmpty(
          c.communities.map((x) => x.name),
          'community names',
        )
        for (const p of [...c.posts, ...c.personalPosts]) {
          expect(p.length).toBeGreaterThanOrEqual(40)
          expect(p.length).toBeLessThanOrEqual(1200)
        }
        for (const h of c.hashtags) expect(h).toMatch(/^#[^\s#]+$/)
        expect(c.topic).toBe(topic)
      })
      it('uses {n:one|few|many} for declinable nouns', () => {
        expect(
          [...c.posts, ...c.personalPosts].filter((p) =>
            /\{n\}\s+(?!человек(?![а-яё]))[а-яё]/i.test(p),
          ),
          'bare {n} before a declinable noun',
        ).toEqual([])
      })
      it('is not templated: skeleton groups ≤ 8, length and register spread', () => {
        const groups = new Map<string, number>()
        for (const p of c.posts) {
          const k = p.split(/\s+/).slice(0, 3).join(' ').toLowerCase()
          groups.set(k, (groups.get(k) ?? 0) + 1)
        }
        const worst = [...groups.entries()].sort((a, b) => b[1] - a[1])[0]
        expect(worst?.[1] ?? 0, `skeleton "${worst?.[0]}"`).toBeLessThanOrEqual(8)
        expect(c.posts.filter((p) => p.length < 90).length, 'short posts').toBeGreaterThanOrEqual(
          15,
        )
        expect(c.posts.filter((p) => p.length > 350).length, 'long posts').toBeGreaterThanOrEqual(
          15,
        )
        expect(
          c.posts.filter(
            (p) => /[«"—]\s?[А-ЯЁ]/.test(p) && /(сказал|говорит|спросил|ответил|—\s)/.test(p),
          ).length,
          'direct speech',
        ).toBeGreaterThanOrEqual(10)
        expect(
          c.posts.filter((p) => /(^|\n)\s*(\d\)|\d\.|—|•)\s/m.test(p)).length,
          'lists',
        ).toBeGreaterThanOrEqual(10)
        expect(
          c.posts.filter((p) => p.trimEnd().endsWith('?')).length,
          'questions',
        ).toBeGreaterThanOrEqual(10)
      })
    })
  }
  it.todo('dialog lines ≥ 300, unique', () => {
    expect(DIALOG_LINES.length).toBeGreaterThanOrEqual(300)
    assertUniqueNonEmpty(DIALOG_LINES, 'dialog')
  })
})

import { afterAll, describe, expect, it } from 'bun:test'
import { SQL } from 'bun'
import { runSeed } from '../src/seed'

// Never point this at the dev database: runSeed TRUNCATEs everything it touches.
const url = process.env.DATABASE_URL_TEST ?? 'postgres://vk:vk@localhost:5432/vk_test'
const sql = new SQL(url)
afterAll(async () => {
  await sql.close()
})

describe('runSeed (scale 0.01)', () => {
  it('populates all tables consistently', async () => {
    const s = await runSeed({
      databaseUrl: url,
      seed: 1,
      scale: 0.01,
      days: 30,
      demoPassword: 'demo1234',
    })
    expect(s.users).toBe(502)
    const count = async (t: string) =>
      Number((await sql.unsafe(`SELECT count(*)::int n FROM ${t}`))[0].n)
    expect(await count('users')).toBe(s.users)
    expect(await count('communities')).toBe(s.communities)
    expect(await count('friendships')).toBe(s.friendships)
    expect(await count('follows')).toBe(s.follows)
    expect(await count('posts')).toBe(s.posts)
    expect(await count('events')).toBe(s.events)
    expect(await count('likes')).toBe(s.likes)
    expect(await count('comments')).toBe(s.comments)
    const [orphan] =
      await sql`SELECT count(*)::int n FROM likes l LEFT JOIN posts p ON p.id = l.target_id WHERE p.id IS NULL`
    expect(orphan.n).toBe(0)
    const [cnt] =
      await sql`SELECT p.likes_count, (SELECT count(*)::int FROM likes WHERE target_id = p.id) real FROM posts p ORDER BY likes_count DESC LIMIT 1`
    expect(cnt.likes_count).toBe(cnt.real)
    // bigint columns come back as strings from Bun's SQL driver, hence the ::int casts on ids.
    const [demo] = await sql`SELECT id::int id, password_hash FROM users WHERE login = 'demo'`
    expect(demo.id).toBe(s.demoUserId)
    expect(await Bun.password.verify('demo1234', demo.password_hash)).toBe(true)
    const [df] =
      await sql`SELECT count(*)::int n FROM friendships WHERE (user_lo = ${s.demoUserId} OR user_hi = ${s.demoUserId}) AND status = 'accepted'`
    expect(df.n).toBeGreaterThan(20)
    const [next] =
      await sql`INSERT INTO users (login, password_hash, first_name, last_name) VALUES ('after_seed', 'x', 'A', 'B') RETURNING id::int id`
    expect(next.id).toBe(s.users + 1)
  }, 120_000)
})

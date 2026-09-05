import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { sql } from 'drizzle-orm'
import { testDb, truncateAll } from '../../test/helpers/db'
import type { Db } from './client'
import { posts, users } from './schema'

let db: Db
beforeAll(async () => {
  db = await testDb()
  await truncateAll(db)
})
afterAll(async () => {
  await db.$client.close()
})

describe('schema', () => {
  it('has all tables', async () => {
    const rows = await db.execute<{ table_name: string }>(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1`,
    )
    const names = rows.map((r) => r.table_name)
    for (const t of [
      'users',
      'communities',
      'friendships',
      'follows',
      'community_members',
      'posts',
      'comments',
      'likes',
      'media',
      'events',
      'events_default',
      'author_stats_daily',
      'user_profiles_ml',
      'friend_suggestions',
      'model_versions',
      'dialogs',
      'messages',
      'dialog_state',
    ])
      expect(names).toContain(t)
  })

  it('events is partitioned and accepts inserts for today', async () => {
    const [u] = await db
      .insert(users)
      .values({ login: 'a', passwordHash: 'x', firstName: 'A', lastName: 'B' })
      .returning()
    const [p] = await db
      .insert(posts)
      .values({ authorType: 'user', authorId: u!.id, text: 'hi' })
      .returning()
    // The migration created partitions around ITS wall-clock; on a long-lived dev volume "now"
    // may have drifted past that window. Ensure the current month's partition exists BEFORE the
    // insert: once a row for this month sits in `events_default`, the partition can no longer be
    // created without first moving it out.
    await db.execute(sql`SELECT ensure_events_partitions(current_date, current_date)`)
    await db.execute(
      sql`INSERT INTO events (user_id, post_id, kind, source, session_id) VALUES (${u!.id}, ${p!.id}, 'view', 'friends', 1)`,
    )
    const [row] = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM events`)
    expect(row?.n).toBe(1)
    const [part] = await db.execute<{ relname: string }>(
      sql`SELECT c.relname FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid WHERE i.inhparent = 'events'::regclass AND c.relname = 'events_' || to_char(now(), 'YYYY_MM')`,
    )
    expect(part?.relname).toBeDefined()
  })

  // A plain `ORDER BY created_at DESC` sorts NULLS FIRST, so a `DESC NULLS LAST` index cannot
  // serve it (measured: 1406 ms seq scan vs 0.065 ms index scan on the 150k-row dev database).
  // The planner still prefers a seq scan on the handful of rows a test inserts, so assert on the
  // index definition itself: Postgres prints the NULLS clause only when it is not the default,
  // i.e. `created_at DESC` means DESC NULLS FIRST and `DESC NULLS LAST` is the regression.
  it('orders the posts recency indexes DESC NULLS FIRST', async () => {
    const [u] = await db
      .insert(users)
      .values({ login: 'idx', passwordHash: 'x', firstName: 'I', lastName: 'X' })
      .returning()
    await db.insert(posts).values(
      Array.from({ length: 50 }, (_, i) => ({
        authorType: 'user' as const,
        authorId: u!.id,
        text: `p${i}`,
      })),
    )
    const rows = await db.execute<{ indexname: string; indexdef: string }>(
      sql`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'posts' AND indexname IN ('posts_created_idx', 'posts_author_created_idx')`,
    )
    expect(rows).toHaveLength(2)
    for (const r of rows) {
      expect(r.indexdef).toContain('created_at DESC')
      expect(r.indexdef).not.toContain('NULLS LAST')
    }
  })

  it('allows explicit ids (identity by default) and hnsw index exists', async () => {
    await db
      .insert(users)
      .values({ id: 500000, login: 'explicit', passwordHash: 'x', firstName: 'E', lastName: 'X' })
    const [idx] = await db.execute<{ indexname: string }>(
      sql`SELECT indexname FROM pg_indexes WHERE indexname = 'posts_embedding_hnsw'`,
    )
    expect(idx?.indexname).toBe('posts_embedding_hnsw')
  })
})

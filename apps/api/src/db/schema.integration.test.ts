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

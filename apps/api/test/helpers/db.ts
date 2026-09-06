import { sql } from 'drizzle-orm'
import { createDb, type Db } from '../../src/db/client'
import { runMigrations } from '../../src/db/migrate'

export const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ?? 'postgres://vk:vk@localhost:5432/vk_test'
let migrated = false

export async function testDb(): Promise<Db> {
  if (!migrated) {
    await runMigrations(TEST_DB_URL)
    migrated = true
  }
  return createDb(TEST_DB_URL)
}

export async function truncateAll(db: Db): Promise<void> {
  await db.execute(
    sql`TRUNCATE events, dialog_state, messages, dialogs, likes, comments, posts, media, community_members, follows, friendships, communities, notifications, friend_suggestion_hidden, users, author_stats_daily, user_profiles_ml, friend_suggestions, model_versions RESTART IDENTITY CASCADE`,
  )
}

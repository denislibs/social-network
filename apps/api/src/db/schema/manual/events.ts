import { bigint, integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core'
import { eventKindEnum } from '../enums'

/** DDL lives in drizzle/0001_events_partitioned.sql (partitioned by created_at). */
export const events = pgTable('events', {
  id: bigint('id', { mode: 'number' }).notNull().generatedByDefaultAsIdentity(),
  userId: bigint('user_id', { mode: 'number' }).notNull(),
  postId: bigint('post_id', { mode: 'number' }).notNull(),
  kind: eventKindEnum('kind').notNull(),
  source: varchar('source', { length: 32 }).notNull(),
  position: integer('position').notNull().default(0),
  sessionId: bigint('session_id', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

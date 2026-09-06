import { sql } from 'drizzle-orm'
import { bigint, index, jsonb, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core'
import { notificationKindEnum } from './enums'
import { users } from './identity'

export const notifications = pgTable(
  'notifications',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    kind: notificationKindEnum('kind').notNull(),
    actorId: bigint('actor_id', { mode: 'number' }).references(() => users.id),
    groupKey: varchar('group_key', { length: 128 }),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (t) => [
    index('notifications_user_id_idx').on(t.userId, t.id.desc()),
    index('notifications_unread_idx').on(t.userId).where(sql`${t.readAt} is null`),
    // Idempotency: at most one *unread* notification per (recipient, kind, actor). A duplicate
    // event (an at-least-once subscriber, a retried publish) hits this index and the insert's
    // `ON CONFLICT DO NOTHING` swallows it. Once the row is read the index no longer covers it,
    // so a genuinely new request from the same actor still produces a fresh notification.
    uniqueIndex('notifications_dedupe_uq')
      .on(t.userId, t.kind, t.actorId)
      .where(sql`${t.readAt} is null`),
  ],
)

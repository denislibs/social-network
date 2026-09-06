import { sql } from 'drizzle-orm'
import { bigint, index, jsonb, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core'
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
  ],
)

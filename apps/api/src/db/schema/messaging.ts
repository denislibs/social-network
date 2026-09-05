import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import type { Attachment } from './content'
import { users } from './identity'

export const dialogs = pgTable(
  'dialogs',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    userLo: bigint('user_lo', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    userHi: bigint('user_hi', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    lastMessageId: bigint('last_message_id', { mode: 'number' }),
    lastLocalId: integer('last_local_id').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('dialogs_pair_uq').on(t.userLo, t.userHi)],
)

export const messages = pgTable(
  'messages',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    dialogId: bigint('dialog_id', { mode: 'number' })
      .notNull()
      .references(() => dialogs.id),
    dialogLocalId: integer('dialog_local_id').notNull(),
    senderId: bigint('sender_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    text: text('text').notNull(),
    attachments: jsonb('attachments').$type<Attachment[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('messages_dialog_local_uq').on(t.dialogId, t.dialogLocalId)],
)

export const dialogState = pgTable(
  'dialog_state',
  {
    dialogId: bigint('dialog_id', { mode: 'number' })
      .notNull()
      .references(() => dialogs.id),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    lastReadLocalId: integer('last_read_local_id').notNull().default(0),
    unreadCount: integer('unread_count').notNull().default(0),
    muted: boolean('muted').notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.dialogId, t.userId] }),
    index('dialog_state_user_idx').on(t.userId),
  ],
)

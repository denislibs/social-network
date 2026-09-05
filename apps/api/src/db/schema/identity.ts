import {
  bigint,
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

export const users = pgTable(
  'users',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    login: varchar('login', { length: 64 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    firstName: varchar('first_name', { length: 64 }).notNull(),
    lastName: varchar('last_name', { length: 64 }).notNull(),
    screenName: varchar('screen_name', { length: 64 }),
    status: varchar('status', { length: 140 }),
    bio: text('bio'),
    avatarMediaId: bigint('avatar_media_id', { mode: 'number' }),
    coverMediaId: bigint('cover_media_id', { mode: 'number' }),
    birthday: date('birthday'),
    city: varchar('city', { length: 64 }),
    isVerified: boolean('is_verified').notNull().default(false),
    popularityRank: integer('popularity_rank').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('users_login_uq').on(t.login),
    uniqueIndex('users_screen_name_uq').on(t.screenName),
    index('users_city_idx').on(t.city),
  ],
)

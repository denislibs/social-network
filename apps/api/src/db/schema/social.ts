import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'
import { followTargetEnum, friendshipStatusEnum, memberRoleEnum, topicEnum } from './enums'
import { users } from './identity'

export const communities = pgTable(
  'communities',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    screenName: varchar('screen_name', { length: 64 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    topic: topicEnum('topic').notNull(),
    avatarMediaId: bigint('avatar_media_id', { mode: 'number' }),
    isVerified: boolean('is_verified').notNull().default(false),
    membersCount: integer('members_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('communities_screen_name_uq').on(t.screenName),
    index('communities_topic_idx').on(t.topic),
    index('communities_name_trgm').using('gin', sql`lower(${t.name}) gin_trgm_ops`),
  ],
)

export const friendships = pgTable(
  'friendships',
  {
    userLo: bigint('user_lo', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    userHi: bigint('user_hi', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    status: friendshipStatusEnum('status').notNull(),
    requesterId: bigint('requester_id', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    /** Anchors the re-request cooldown (see `Friendship.rerequest`): the original requester may
     * only ask again 24h after the decline, the decliner may re-open contact immediately. */
    declinedAt: timestamp('declined_at', { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.userLo, t.userHi] }),
    index('friendships_hi_idx').on(t.userHi, t.status),
    index('friendships_lo_idx').on(t.userLo, t.status),
    index('friendships_requester_idx').on(t.requesterId, t.status),
  ],
)

export const follows = pgTable(
  'follows',
  {
    followerId: bigint('follower_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    targetType: followTargetEnum('target_type').notNull(),
    targetId: bigint('target_id', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.targetType, t.targetId] }),
    index('follows_target_idx').on(t.targetType, t.targetId),
  ],
)

export const communityMembers = pgTable(
  'community_members',
  {
    communityId: bigint('community_id', { mode: 'number' })
      .notNull()
      .references(() => communities.id),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    role: memberRoleEnum('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.communityId, t.userId] }),
    index('community_members_user_idx').on(t.userId),
  ],
)

export const friendSuggestionHidden = pgTable(
  'friend_suggestion_hidden',
  {
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    hiddenId: bigint('hidden_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.hiddenId] })],
)

import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
  vector,
} from 'drizzle-orm/pg-core'
import { authorTypeEnum, likeTargetEnum, mediaKindEnum, topicEnum } from './enums'
import { users } from './identity'

export type Attachment = {
  kind: 'photo' | 'audio' | 'link'
  mediaId?: number
  meta?: Record<string, unknown>
}

export const media = pgTable(
  'media',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    ownerId: bigint('owner_id', { mode: 'number' }).notNull(),
    kind: mediaKindEnum('kind').notNull(),
    bucket: varchar('bucket', { length: 64 }).notNull(),
    key: text('key').notNull(),
    contentHash: varchar('content_hash', { length: 64 }),
    width: integer('width'),
    height: integer('height'),
    duration: integer('duration'),
    blurhash: varchar('blurhash', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('media_hash_idx').on(t.contentHash)],
)

export const posts = pgTable(
  'posts',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    authorType: authorTypeEnum('author_type').notNull(),
    authorId: bigint('author_id', { mode: 'number' }).notNull(),
    text: text('text').notNull(),
    topic: topicEnum('topic'),
    attachments: jsonb('attachments').$type<Attachment[]>().notNull().default([]),
    likesCount: integer('likes_count').notNull().default(0),
    commentsCount: integer('comments_count').notNull().default(0),
    repostsCount: integer('reposts_count').notNull().default(0),
    viewsCount: integer('views_count').notNull().default(0),
    embedding: vector('embedding', { dimensions: 384 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // `.desc()` alone emits `DESC NULLS LAST`, which a plain `ORDER BY created_at DESC`
  // (NULLS FIRST by default) cannot use — the planner falls back to a seq scan + sort.
  // `.nullsFirst()` makes the index order match the default ordering of the reads.
  (t) => [
    index('posts_author_created_idx').on(t.authorType, t.authorId, t.createdAt.desc().nullsFirst()),
    index('posts_created_idx').on(t.createdAt.desc().nullsFirst()),
    index('posts_embedding_hnsw').using('hnsw', t.embedding.op('vector_cosine_ops')),
  ],
)

export const comments = pgTable(
  'comments',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    postId: bigint('post_id', { mode: 'number' })
      .notNull()
      .references(() => posts.id),
    authorId: bigint('author_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    parentId: bigint('parent_id', { mode: 'number' }),
    text: text('text').notNull(),
    likesCount: integer('likes_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('comments_post_idx').on(t.postId, t.id)],
)

export const likes = pgTable(
  'likes',
  {
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    targetType: likeTargetEnum('target_type').notNull(),
    targetId: bigint('target_id', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.targetType, t.targetId] }),
    index('likes_target_idx').on(t.targetType, t.targetId),
  ],
)

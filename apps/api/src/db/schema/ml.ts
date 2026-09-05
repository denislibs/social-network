import {
  bigint,
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  vector,
} from 'drizzle-orm/pg-core'
import { authorTypeEnum, modelKindEnum } from './enums'

export const authorStatsDaily = pgTable(
  'author_stats_daily',
  {
    authorType: authorTypeEnum('author_type').notNull(),
    authorId: bigint('author_id', { mode: 'number' }).notNull(),
    day: date('day').notNull(),
    posts: integer('posts').notNull().default(0),
    likes: integer('likes').notNull().default(0),
    comments: integer('comments').notNull().default(0),
    views: integer('views').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.authorType, t.authorId, t.day] })],
)

export const userProfilesMl = pgTable(
  'user_profiles_ml',
  {
    userId: bigint('user_id', { mode: 'number' }).primaryKey(),
    interestVector: vector('interest_vector', { dimensions: 384 }),
    topicWeights: jsonb('topic_weights').$type<Record<string, number>>().notNull().default({}),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('user_profiles_ml_vec_hnsw').using('hnsw', t.interestVector.op('vector_cosine_ops')),
  ],
)

export const friendSuggestions = pgTable(
  'friend_suggestions',
  {
    userId: bigint('user_id', { mode: 'number' }).notNull(),
    candidateId: bigint('candidate_id', { mode: 'number' }).notNull(),
    score: doublePrecision('score').notNull(),
    computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.candidateId] })],
)

export const modelVersions = pgTable('model_versions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  kind: modelKindEnum('kind').notNull(),
  artifactKey: text('artifact_key').notNull(),
  metrics: jsonb('metrics').$type<Record<string, number>>().notNull().default({}),
  trainedAt: timestamp('trained_at', { withTimezone: true }).notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(false),
})

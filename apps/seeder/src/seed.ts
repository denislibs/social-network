import type { SQL } from 'bun'
import { CORPUS } from './corpus'
import { generateCommunities } from './generate/communities'
import { buildDemoGraph } from './generate/demo'
import { simulateEvents } from './generate/events'
import { generateFollows, generateFriendships } from './generate/graph'
import { generatePosts } from './generate/posts'
import { SEED_NOW } from './generate/types'
import { generateUsers } from './generate/users'
import { Rng } from './rng'
import { openSql } from './write/db'
import { insertChunked } from './write/insert'
import { recomputeCounters, resetDatabase, syncSequences } from './write/reset'

export type SeedSummary = {
  users: number
  communities: number
  friendships: number
  follows: number
  posts: number
  events: number
  likes: number
  comments: number
  demoUserId: number
  denisUserId: number
}
export type SeedOptions = {
  databaseUrl: string
  seed: number
  scale: number
  days: number
  demoPassword: string
  log?: (s: string) => void
}

const ARGON = { algorithm: 'argon2id', memoryCost: 19456, timeCost: 2 } as const

export async function runSeed(o: SeedOptions): Promise<SeedSummary> {
  const log = o.log ?? (() => {})
  const cfg = { seed: o.seed, scale: o.scale, days: o.days }
  const rng = new Rng(o.seed)
  const t0 = Date.now()
  const users = generateUsers(cfg, rng.fork('users'))
  const communities = generateCommunities(cfg, rng.fork('communities'), CORPUS)
  const friendships = generateFriendships(users, rng.fork('friends'))
  const { follows, memberships } = generateFollows(users, communities, rng.fork('follows'))
  const posts = generatePosts(cfg, users, communities, CORPUS, rng.fork('posts'))
  const { events, likes, comments } = simulateEvents(
    cfg,
    users,
    posts,
    { follows, friendships },
    CORPUS,
    rng.fork('events'),
    { activeShare: 0.3, sessions: 20, impressions: 20 },
  )
  log(
    `generated in ${Date.now() - t0}ms: users=${users.length} posts=${posts.length} events=${events.length}`,
  )

  // One argon2 hash for every generated account (password `password`): argon2id at 19 MiB costs
  // ~50 ms, so hashing 50k users individually would dominate the whole seed run.
  const sharedHash = await Bun.password.hash('password', ARGON)
  const demoGraph = buildDemoGraph(users, communities, rng.fork('demo'))
  users.push(demoGraph.demo, demoGraph.denis)
  friendships.push(...demoGraph.friendships)
  follows.push(...demoGraph.follows)
  memberships.push(...demoGraph.memberships)
  const demo = { demoId: demoGraph.demo.id, denisId: demoGraph.denis.id }

  const sql = openSql(o.databaseUrl)
  try {
    await resetDatabase(sql)
    await insertChunked(
      sql,
      'users',
      users.map((u) => ({
        id: u.id,
        login: u.login,
        password_hash: sharedHash,
        first_name: u.firstName,
        last_name: u.lastName,
        screen_name: u.screenName,
        status: u.status,
        birthday: u.birthday,
        city: u.city,
        is_verified: u.tier === 'star',
        popularity_rank: Math.round(1 / u.popularity),
        created_at: u.createdAt,
      })),
      log,
    )
    const demoHash = await Bun.password.hash(o.demoPassword, ARGON)
    await sql`UPDATE users SET password_hash = ${demoHash} WHERE login IN ('demo', 'deniscoreablev')`
    await insertChunked(
      sql,
      'communities',
      communities.map((c) => ({
        id: c.id,
        screen_name: c.screenName,
        name: c.name,
        description: c.description,
        topic: c.topic,
        is_verified: c.popularity > 0.5,
        created_at: c.createdAt,
      })),
      log,
    )
    await insertChunked(
      sql,
      'friendships',
      friendships.map((f) => ({
        user_lo: f.lo,
        user_hi: f.hi,
        status: f.status,
        requester_id: f.requesterId,
        created_at: f.createdAt,
        accepted_at: f.acceptedAt,
      })),
      log,
    )
    await insertChunked(
      sql,
      'follows',
      follows.map((f) => ({
        follower_id: f.followerId,
        target_type: f.targetType,
        target_id: f.targetId,
        created_at: f.createdAt,
      })),
      log,
    )
    await insertChunked(
      sql,
      'community_members',
      memberships.map((m) => ({
        community_id: m.communityId,
        user_id: m.userId,
        role: m.role,
        created_at: m.createdAt,
      })),
      log,
    )
    await insertChunked(
      sql,
      'posts',
      posts.map((p) => ({
        id: p.id,
        author_type: p.authorType,
        author_id: p.authorId,
        text: p.text,
        topic: p.topic,
        attachments: JSON.stringify(
          p.hasPhoto ? [{ kind: 'photo', meta: { placeholder: true, seed: p.id } }] : [],
        ),
        created_at: p.createdAt,
      })),
      log,
    )
    await insertChunked(
      sql,
      'likes',
      likes.map((l) => ({
        user_id: l.userId,
        target_type: 'post',
        target_id: l.postId,
        created_at: l.createdAt,
      })),
      log,
    )
    await insertChunked(
      sql,
      'comments',
      comments.map((c) => ({
        post_id: c.postId,
        author_id: c.authorId,
        text: c.text,
        created_at: c.createdAt,
      })),
      log,
    )
    // Events span [SEED_NOW - days, SEED_NOW]; the migration only pre-creates partitions around
    // its own wall-clock, so ensure the whole seed window (plus a month of slack either side)
    // exists before inserting. Without this the rows land in `events_default`, which then blocks
    // creating the real partition for those months.
    await ensureEventPartitions(sql, o.days)
    await insertChunked(
      sql,
      'events',
      events.map((e) => ({
        user_id: e.userId,
        post_id: e.postId,
        kind: e.kind,
        source: e.source,
        position: e.position,
        session_id: e.sessionId,
        created_at: e.createdAt,
      })),
      log,
    )
    await recomputeCounters(sql)
    await syncSequences(sql)
  } finally {
    await sql.close()
  }
  log(`seeded in ${Date.now() - t0}ms`)
  return {
    users: users.length,
    communities: communities.length,
    friendships: friendships.length,
    follows: follows.length,
    posts: posts.length,
    events: events.length,
    likes: likes.length,
    comments: comments.length,
    demoUserId: demo.demoId,
    denisUserId: demo.denisId,
  }
}

/** `YYYY-MM-01` for the month containing `t`. */
const monthStart = (t: number): string => `${new Date(t).toISOString().slice(0, 8)}01`

/**
 * Creates the monthly `events` partitions covering the seed window. Idempotent: the SQL function
 * uses CREATE TABLE IF NOT EXISTS, so re-running the seeder is free.
 */
async function ensureEventPartitions(sql: SQL, days: number): Promise<void> {
  const from = monthStart(SEED_NOW - (days + 31) * 86400_000)
  const to = monthStart(SEED_NOW + 31 * 86400_000)
  await sql`SELECT ensure_events_partitions(${from}::date, ${to}::date)`
}

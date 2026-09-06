# Subsystem 2: Social Graph (profiles, friends, communities, search, PYMK, notifications) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement spec `docs/superpowers/specs/2026-09-06-social-graph-design.md`: profile pages with editing, VK-style friendships and follows, communities with membership, trigram search, "Возможно, вы знакомы" by ego-graph SQL with Redis cache, and a notifications module with a multi-tab coordinator on the frontend.

**Architecture:** Backend adds bounded contexts `social-graph` and `notifications` (DDD layers, InversifyJS tokens, CQRS handlers) plus an `identity` extension for profiles; contexts talk only through `EventBus` events and one kernel-level read port (`KERNEL.SocialRead`). Frontend adds FSD slices (`entities/{user,community,notification}`, `features/{friendship,community-membership,suggestions,search,edit-profile,create-community,notifications}`, widgets, pages), all side effects behind DI gateways, all logic in hooks, VKUI skeletons for loading, and a `TabCoordinator` (Web Locks + BroadcastChannel) so only the leader tab polls.

**Tech Stack:** Bun 1.4, Elysia 1.4, Drizzle 0.45 (bun-sql), Postgres 17 + `pg_trgm`, ioredis, inversify 8 (no decorators), React 19, VKUI 8.4, `@vkontakte/icons`, react-router 8, TanStack Query 5, Vitest 5 + RTL, Playwright.

## Global Constraints

- Frontend uses only VKUI components/tokens/icons; `apps/web/src/vkui-only.test.ts` must stay green (no raw `button/input/select/textarea/a/img`, no hex/rgb colors, no font sizing; CSS modules layout-only + `var(--vkui--…)`).
- Strict FSD `app → pages → widgets → features → entities → shared`; imports into a slice only via its `index.ts`; Steiger + oxlint FSD overrides green; no logic in `pages/`; views in `ui/` without `useState` business state, API calls, or `try/catch`; hooks in `model/`.
- DI: tokens via `ServiceIdentifier` from `@/shared/di` (web) or `token<T>()` from `kernel/di.ts` (api); real bindings only in `apps/web/src/app/composition/container.ts` and `apps/api/src/modules/<module>/infrastructure/<module>.container.ts`; every gateway call to `unwrap` passes `{ bus }` or `{ silent401: true }`.
- Frontend TDD on Vitest: failing test first, then implementation; hook tests via `renderHook(useX, { wrapper })` with fakes bound `toConstantValue`; `vi.mock` only for VKUI/react-router or first-party context hooks without a DI seam.
- Loading states are VKUI `Skeleton` blocks shaped like the content, `aria-busy="true"` on the container, only while `isPending`; `PanelSpinner` only as route `Suspense` fallback and in `RequireAuth`.
- Backend: DDD layers `domain → application → infrastructure/presentation`; `apps/api/src/modules/boundaries.test.ts` must stay green (no cross-module inner imports, no `inversify` import outside `kernel/di.ts`, presentation never imports infrastructure). Errors are `AppError` subclasses with `code`; HTTP body `{ error: { code, message } }`.
- Error codes (exact): `self_friendship` 400, `friendship_not_found` 404, `not_addressee` 403, `request_cooldown` 409, `screen_name_taken` 409, `screen_name_reserved` 422, `invalid_screen_name` 422, `last_admin` 409, `community_not_found` 404, `user_not_found` 404, `validation` 422.
- Cursor pagination: `{ items, nextCursor: string | null }`, cursor = base64 of `${createdAtIso}|${id}`, page size 20.
- Notification kinds (exact enum order): `friend_request, friend_accepted, new_follower, community_invite, post_like, comment_like, post_comment, comment_reply, mention, repost, community_post, birthday`.
- PYMK score: `3*mutual + 2*shared_communities + 1*same_city + 0.5*shared_topics`, top 20, Redis key `pymk:{userId}` TTL 600 s.
- Gates per task (run what the task touches): `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration` (Docker up), `cd apps/web && bunx playwright test` in the final task. Commits: Conventional Commits, English, trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- `apps/web/e2e/auth.spec.ts` must not be modified.

---

## File map

Backend (`apps/api/src`):
- `kernel/`: `screen-name.ts` (+test), `social-read.ts` (port + token), `http/auth-plugin.ts`, `tokens.ts` (+`SessionResolver`, `SocialRead`), `cursor.ts` (+test).
- `db/schema/notifications.ts`, `db/schema/social.ts` (+indexes, `friend_suggestion_hidden`), `db/schema/enums.ts` (+`notificationKindEnum`), `drizzle/0003_social_graph.sql`.
- `modules/identity/`: `domain/user.ts` (+`updateProfile`), `application/{commands/update-profile.ts,queries/get-profile.ts,queries/search-users.ts,dto.ts,ports.ts,register.ts}`, `infrastructure/{drizzle-user-repository.ts,drizzle-user-read-model.ts}`, `presentation/routes.ts`, `index.ts` (bind/mount split).
- `modules/social-graph/`: `domain/{friendship.ts,community.ts,errors.ts,events.ts,value-objects.ts}`, `application/{ports.ts,dto.ts,register.ts,commands/*.ts,queries/*.ts,testing/{fakes.ts,container.ts}}`, `infrastructure/{drizzle-friendship-repository.ts,drizzle-follow-repository.ts,drizzle-community-repository.ts,drizzle-membership-repository.ts,drizzle-social-read-model.ts,pymk.sql.ts,redis-suggestion-cache.ts,social-graph.container.ts}`, `presentation/routes.ts`, `index.ts`.
- `modules/notifications/`: `application/{ports.ts,dto.ts,register.ts,commands/mark-read.ts,queries/{get-unread-count.ts,get-notifications.ts},subscribers/graph-subscriber.ts,testing/{fakes.ts,container.ts}}`, `infrastructure/{drizzle-notification-repository.ts,drizzle-notification-read-model.ts,notifications.container.ts}`, `presentation/routes.ts`, `index.ts`.
- `app.ts` (bind all → mount all), `package.json` exports (`./dto` widened).

Contracts: `packages/contracts/src/{index.ts,cities.ts}`.

Frontend (`apps/web/src`):
- `shared/lib/tabs/{ports.ts,browser.ts,testing.ts,index.ts}`, `shared/lib/query-keys.ts`, `shared/lib/use-delayed-pending.ts`, `shared/lib/cursor.ts`, `shared/config/cities.ts`.
- `entities/user/{model/{types.ts,ports.ts},api/userApi.ts,ui/{UserCell.tsx,UserCellSkeleton.tsx,UserAvatar.tsx}}`, `entities/community/{model/{types.ts,ports.ts},api/communityApi.ts,ui/{CommunityCell.tsx,CommunityCellSkeleton.tsx}}`, `entities/notification/{model/{types.ts,kinds.ts,ports.ts},api/notificationApi.ts,ui/NotificationItem.tsx}`.
- `features/friendship`, `features/community-membership`, `features/suggestions`, `features/search`, `features/edit-profile`, `features/create-community`, `features/notifications` — each `model/{ports.ts?,use*.ts,errors.ts?,testing.ts}`, `api/*.ts` where the feature owns a gateway, `ui/*.tsx`, `index.ts`.
- `widgets/{profile-card,friends-list,friend-requests,pymk-block,community-header,communities-list,notifications-list,search-results}`, `widgets/app-shell` (bell, search box, friends counter, right column).
- `pages/{profile,edit-profile,friends,communities,community,search,notifications,handle}`; `app/router.tsx`; `app/composition/container.ts`; `app/main.tsx` (`NotificationSync`).

Seeder: `apps/seeder/src/seed.ts` (`addDemoUsers` guarantees pending requests), `apps/seeder/src/generate/cities.ts` re-exports contracts. E2E: `apps/web/e2e/social.spec.ts`.

---

### Task 1: Backend groundwork — kernel auth plugin, module bind/mount split, `ScreenName`, `SocialRead` port, cursor helper, cities in contracts

**Files:**
- Create: `apps/api/src/kernel/http/auth-plugin.ts`, `apps/api/src/kernel/screen-name.ts`, `apps/api/src/kernel/screen-name.test.ts`, `apps/api/src/kernel/social-read.ts`, `apps/api/src/kernel/cursor.ts`, `apps/api/src/kernel/cursor.test.ts`, `packages/contracts/src/cities.ts`
- Modify: `apps/api/src/kernel/tokens.ts`, `apps/api/src/modules/identity/index.ts`, `apps/api/src/modules/identity/presentation/routes.ts`, `apps/api/src/modules/identity/infrastructure/identity.container.ts`, `apps/api/src/app.ts`, `packages/contracts/src/index.ts`, `apps/seeder/src/generate/cities.ts`, `apps/seeder/package.json`
- Delete: `apps/api/src/modules/identity/presentation/auth-macro.ts`

**Interfaces:**
- Produces:
  ```ts
  // kernel/tokens.ts (append)
  SessionResolver: token<SessionResolver>('SessionResolver')   // { get(token): Promise<{userId:number}|null>; touch(token): Promise<void> }
  SocialRead: token<SocialReadPort>('SocialRead')
  // kernel/social-read.ts
  export type Relation = 'none' | 'outgoing' | 'incoming' | 'friends' | 'self'
  export type Counters = { friends: number; followers: number; communities: number; incomingRequests: number }
  export interface SocialReadPort { relation(me: number | null, other: number): Promise<Relation>; counters(userId: number): Promise<Counters> }
  // kernel/http/auth-plugin.ts
  export function authPlugin(sessions: SessionResolver)  // Elysia macro `auth: true` → { user: { id }, sessionToken }; also macro `optionalAuth: true` → { user: { id } | null }
  // kernel/screen-name.ts
  export class ScreenName { static create(raw: string): ScreenName; readonly value: string }  // throws DomainRuleError('invalid_screen_name'|'screen_name_reserved')
  export const RESERVED_SCREEN_NAMES: ReadonlySet<string>
  // kernel/cursor.ts
  export type CursorKey = { createdAt: Date; id: number }
  export function encodeCursor(k: CursorKey): string
  export function decodeCursor(raw: string | undefined): CursorKey | null  // null when absent; throws ValidationError('bad_cursor') when malformed
  export const PAGE_SIZE = 20
  // module contract used by app.ts
  export function bindIdentity(c: Container): void; export async function mountIdentity(c: Container): Promise<Elysia>
  // contracts
  export const CITIES: readonly string[]  // moved from seeder, same 30+ values
  ```

- [ ] **Step 1: Failing tests for `ScreenName` and cursor**

```ts
// apps/api/src/kernel/screen-name.test.ts
import { describe, expect, it } from 'bun:test'
import { ScreenName } from './screen-name'

describe('ScreenName', () => {
  it('accepts a-z start, 3..32 of a-z 0-9 _ . and lower-cases', () => {
    expect(ScreenName.create('Denis.Korablev_1').value).toBe('denis.korablev_1')
  })
  it.each(['ab', 'x'.repeat(33), '1abc', 'ab-c', 'аб'])('rejects %s', (raw) => {
    expect(() => ScreenName.create(raw)).toThrow(expect.objectContaining({ code: 'invalid_screen_name' }))
  })
  it.each(['id123', 'club7', 'feed', 'im', 'friends', 'communities', 'photos', 'music', 'search', 'login', 'register', 'edit', 'notifications', 'api'])(
    'rejects reserved %s',
    (raw) => {
      expect(() => ScreenName.create(raw)).toThrow(expect.objectContaining({ code: 'screen_name_reserved' }))
    },
  )
  it('allows names that merely contain a reserved word', () => {
    expect(ScreenName.create('idea_club').value).toBe('idea_club')
  })
})
```

```ts
// apps/api/src/kernel/cursor.test.ts
import { describe, expect, it } from 'bun:test'
import { decodeCursor, encodeCursor } from './cursor'

describe('cursor', () => {
  it('round-trips', () => {
    const k = { createdAt: new Date('2026-09-06T10:00:00.000Z'), id: 42 }
    expect(decodeCursor(encodeCursor(k))).toEqual(k)
  })
  it('returns null for undefined and throws bad_cursor for garbage', () => {
    expect(decodeCursor(undefined)).toBeNull()
    expect(() => decodeCursor('!!!')).toThrow(expect.objectContaining({ code: 'bad_cursor' }))
    expect(() => decodeCursor(btoa('nope'))).toThrow(expect.objectContaining({ code: 'bad_cursor' }))
  })
})
```

- [ ] **Step 2: Run to verify failure** — `bun test apps/api/src/kernel` → FAIL (modules missing).

- [ ] **Step 3: Implement kernel pieces**

```ts
// apps/api/src/kernel/screen-name.ts
import { DomainRuleError } from './errors'

export const RESERVED_SCREEN_NAMES: ReadonlySet<string> = new Set([
  'feed', 'im', 'friends', 'communities', 'photos', 'music', 'search', 'login', 'register', 'edit',
  'notifications', 'api',
])
const RESERVED_PREFIX = /^(id|club)\d/

export class ScreenName {
  private constructor(readonly value: string) {}
  static create(raw: string): ScreenName {
    const v = raw.trim().toLowerCase()
    if (!/^[a-z][a-z0-9_.]{2,31}$/.test(v))
      throw new DomainRuleError('invalid_screen_name', 'Screen name must be 3-32 chars: a-z, 0-9, _ or ., starting with a letter')
    if (RESERVED_SCREEN_NAMES.has(v) || RESERVED_PREFIX.test(v))
      throw new DomainRuleError('screen_name_reserved', 'This screen name is reserved')
    return new ScreenName(v)
  }
  static fromTrusted(v: string): ScreenName { return new ScreenName(v) }
}
```

```ts
// apps/api/src/kernel/cursor.ts
import { ValidationError } from './errors'
export type CursorKey = { createdAt: Date; id: number }
export const PAGE_SIZE = 20
export function encodeCursor(k: CursorKey): string {
  return Buffer.from(`${k.createdAt.toISOString()}|${k.id}`).toString('base64url')
}
export function decodeCursor(raw: string | undefined): CursorKey | null {
  if (raw === undefined || raw === '') return null
  let text: string
  try { text = Buffer.from(raw, 'base64url').toString('utf8') } catch { throw new ValidationError('bad_cursor', 'Malformed cursor') }
  const [iso, id] = text.split('|')
  const createdAt = new Date(iso ?? '')
  const n = Number(id)
  if (!iso || Number.isNaN(createdAt.getTime()) || !Number.isInteger(n)) throw new ValidationError('bad_cursor', 'Malformed cursor')
  return { createdAt, id: n }
}
```

```ts
// apps/api/src/kernel/social-read.ts
export type Relation = 'none' | 'outgoing' | 'incoming' | 'friends' | 'self'
export type Counters = { friends: number; followers: number; communities: number; incomingRequests: number }
/** Cross-context read port: identity's GetProfile needs relation/counters owned by social-graph. */
export interface SocialReadPort {
  relation(me: number | null, other: number): Promise<Relation>
  counters(userId: number): Promise<Counters>
}
```

```ts
// apps/api/src/kernel/tokens.ts — append inside KERNEL
  SessionResolver: token<SessionResolver>('SessionResolver'),
  SocialRead: token<SocialReadPort>('SocialRead'),
// and above:
export interface SessionResolver { get(token: string): Promise<{ userId: number } | null>; touch(token: string): Promise<void> }
import type { SocialReadPort } from './social-read'
```

```ts
// apps/api/src/kernel/http/auth-plugin.ts
import { Elysia, t } from 'elysia'
import { UnauthorizedError } from '../errors'
import type { SessionResolver } from '../tokens'

const sessionCookie = t.Cookie({ sid: t.Optional(t.String()) })

export function authPlugin(sessions: SessionResolver) {
  return new Elysia({ name: 'auth' })
    .macro('auth', {
      cookie: sessionCookie,
      async resolve({ cookie }) {
        const token = cookie.sid?.value
        if (!token) throw new UnauthorizedError()
        const session = await sessions.get(token)
        if (!session) throw new UnauthorizedError()
        await sessions.touch(token)
        return { user: { id: session.userId }, sessionToken: token }
      },
    })
    .macro('optionalAuth', {
      cookie: sessionCookie,
      async resolve({ cookie }) {
        const token = cookie.sid?.value
        const session = token ? await sessions.get(token) : null
        return { viewer: session ? { id: session.userId } : null }
      },
    })
}
```

Identity: in `identity.container.ts` add `c.bind(KERNEL.SessionResolver).toResolvedValue((s) => s, [IDENTITY.SessionStore])`. In `presentation/routes.ts` replace `import { authPlugin } from './auth-macro'` with `import { authPlugin } from '../../../kernel/http/auth-plugin'` and `.use(authPlugin(c.get(KERNEL.SessionResolver)))`. Delete `auth-macro.ts`. Split `identity/index.ts`:
```ts
export function bindIdentity(c: Container): void { bindIdentityInfrastructure(c) }
export async function mountIdentity(c: Container) { await registerIdentityHandlers(c); return identityRoutes(c) }
```
`app.ts`:
```ts
const container = createKernelContainer(deps)
bindIdentity(container)            // later tasks add bindSocialGraph, bindNotifications here
const identity = await mountIdentity(container)
return new Elysia({ prefix: '/api/v1' }).onError(...).get('/health', ...).use(identity)
```

Contracts: create `packages/contracts/src/cities.ts` with the exact array currently in `apps/seeder/src/generate/cities.ts`; export from `packages/contracts/src/index.ts` (`export { CITIES } from './cities'`); `apps/seeder/src/generate/cities.ts` becomes `export { CITIES } from '@vkc/contracts'`; add `"@vkc/contracts": "workspace:*"` to seeder dependencies and run `bun install`.

- [ ] **Step 4: Run** — `bun test apps/api/src/kernel`, `bun run test:unit`, `bun run test:integration` (identity e2e must still pass with the kernel plugin), `bun run typecheck`, `bun run lint`.

- [ ] **Step 5: Commit** — `git commit -m "refactor(api): kernel auth plugin, module bind/mount split, ScreenName, cursor, SocialRead port; cities in contracts"`

---

### Task 2: Migration 0003 — notifications table, hidden suggestions, trigram indexes

**Files:**
- Create: `apps/api/src/db/schema/notifications.ts`, `apps/api/drizzle/0003_social_graph.sql` (generated + edited), `apps/api/drizzle/meta/0003_snapshot.json` (generated)
- Modify: `apps/api/src/db/schema/enums.ts`, `apps/api/src/db/schema/social.ts`, `apps/api/src/db/schema/identity.ts`, `apps/api/src/db/schema/index.ts`, `apps/api/drizzle.config.ts`, `apps/api/test/helpers/db.ts` (truncate list), `apps/seeder/src/write/reset.ts` (tables list)
- Test: `apps/api/src/db/schema.integration.test.ts` (new)

**Interfaces:**
- Produces: tables `notifications`, `friend_suggestion_hidden`; enum `notification_kind`; `NOTIFICATION_KINDS` const array exported from `enums.ts`; indexes `users_name_trgm`, `users_screen_name_trgm`, `communities_name_trgm`, `friendships_requester_idx`, `notifications_user_id_idx`, `notifications_unread_idx`.

- [ ] **Step 1: Failing integration test**

```ts
// apps/api/src/db/schema.integration.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { sql } from 'drizzle-orm'
import { testDb } from '../../test/helpers/db'
import type { Db } from './client'

let db: Db
beforeAll(async () => { db = await testDb() })
afterAll(async () => { await db.$client.close() })

describe('migration 0003', () => {
  it('creates pg_trgm, notifications, hidden suggestions and trigram indexes', async () => {
    const ext = await db.execute(sql`select 1 from pg_extension where extname = 'pg_trgm'`)
    expect(ext.length).toBe(1)
    const idx = await db.execute<{ indexname: string }>(sql`select indexname from pg_indexes where indexname in ('users_name_trgm','users_screen_name_trgm','communities_name_trgm','friendships_requester_idx','notifications_unread_idx')`)
    expect(idx.map((r) => r.indexname).sort()).toEqual(['communities_name_trgm','friendships_requester_idx','notifications_unread_idx','users_name_trgm','users_screen_name_trgm'])
    const kinds = await db.execute<{ enumlabel: string }>(sql`select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'notification_kind' order by enumsortorder`)
    expect(kinds.map((k) => k.enumlabel)).toEqual(['friend_request','friend_accepted','new_follower','community_invite','post_like','comment_like','post_comment','comment_reply','mention','repost','community_post','birthday'])
  })
})
```

- [ ] **Step 2: Run** — `bun test apps/api/src/db/schema.integration.test.ts` → FAIL.

- [ ] **Step 3: Schema changes**

```ts
// enums.ts (append)
export const NOTIFICATION_KINDS = ['friend_request','friend_accepted','new_follower','community_invite','post_like','comment_like','post_comment','comment_reply','mention','repost','community_post','birthday'] as const
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]
export const notificationKindEnum = pgEnum('notification_kind', NOTIFICATION_KINDS)
```

```ts
// notifications.ts
import { bigint, index, jsonb, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core'
import { notificationKindEnum } from './enums'
import { users } from './identity'

export const notifications = pgTable(
  'notifications',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
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
```
(`import { sql } from 'drizzle-orm'`.)

```ts
// social.ts (append)
export const friendSuggestionHidden = pgTable(
  'friend_suggestion_hidden',
  {
    userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
    hiddenId: bigint('hidden_id', { mode: 'number' }).notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.hiddenId] })],
)
// friendships indexes: add
    index('friendships_requester_idx').on(t.requesterId, t.status),
// communities indexes: add
    index('communities_name_trgm').using('gin', sql`lower(${t.name}) gin_trgm_ops`),
```

```ts
// identity.ts users indexes: add
    index('users_name_trgm').using('gin', sql`lower(${t.firstName} || ' ' || ${t.lastName}) gin_trgm_ops`),
    index('users_screen_name_trgm').using('gin', sql`lower(${t.screenName}) gin_trgm_ops`),
```

Add `'./src/db/schema/notifications.ts'` to `drizzle.config.ts`, `export * from './notifications'` in `schema/index.ts`. Run `cd apps/api && bunx drizzle-kit generate --name social_graph`. Open the generated `drizzle/0003_social_graph.sql` and prepend `CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint` as the first line (the trigram indexes need it). Append `notifications, friend_suggestion_hidden` to the TRUNCATE lists in `apps/api/test/helpers/db.ts` and `apps/seeder/src/write/reset.ts` (children first: put them before `users`).

- [ ] **Step 4: Run** — `bun run db:migrate` against dev, `bun test apps/api/src/db/schema.integration.test.ts` (test DB migrates itself), `bun run test:integration`, `bun run typecheck`.

- [ ] **Step 5: Commit** — `feat(db): migration 0003 — notifications, hidden suggestions, pg_trgm indexes`

---

### Task 3: `social-graph` domain — `Friendship`, `Community`, value objects, events

**Files:**
- Create: `apps/api/src/modules/social-graph/domain/{errors.ts,events.ts,value-objects.ts,friendship.ts,community.ts,friendship.test.ts,community.test.ts}`

**Interfaces:**
- Produces:
  ```ts
  // errors.ts — all extend AppError subclasses from kernel/errors
  SelfFriendshipError (400 self_friendship), FriendshipNotFound (404 friendship_not_found), NotRequestAddressee (403 not_addressee),
  RequestCooldown (409 request_cooldown), LastAdminCannotLeave (409 last_admin), CommunityNotFound (404 community_not_found)
  // value-objects.ts
  export function orderPair(a: number, b: number): { lo: number; hi: number }
  export class CommunityName { static create(raw: string): CommunityName; readonly value: string }  // 2..120 chars trimmed, DomainRuleError('invalid_community_name')
  // events.ts
  FriendRequested { requesterId, addresseeId }; FriendshipAccepted { userLo, userHi, acceptedBy }; FriendRequestDeclined { requesterId, addresseeId };
  FriendshipRemoved { removedBy, other }; CommunityCreated { communityId, ownerId }; CommunityJoined { communityId, userId }; CommunityLeft { communityId, userId }
  // friendship.ts
  export type FriendshipStatus = 'pending' | 'accepted' | 'declined'
  export type FriendshipProps = { lo: number; hi: number; status: FriendshipStatus; requesterId: number; createdAt: Date; acceptedAt: Date | null }
  export class Friendship {
    static request(from: number, to: number, now?: Date): Friendship          // SelfFriendshipError
    static rehydrate(p: FriendshipProps): Friendship
    accept(by: number, now?: Date): void        // pending & by===addressee → accepted (+event); accepted → no-op; else NotRequestAddressee
    decline(by: number): void                   // pending & by===addressee → declined (+event); else NotRequestAddressee
    remove(by: number): void                    // accepted → marks removed (+FriendshipRemoved), else FriendshipNotFound
    cancel(by: number): void                    // pending & by===requester → marks removed silently (no event); else NotRequestAddressee
    rerequest(by: number, now: Date): void      // declined & by===requester… see rules: declined & by===other side → pending with new requester (+FriendRequested), cooldown 24h since createdAt else RequestCooldown; declined & by===original requester → RequestCooldown too
    counterRequest(by: number, now?: Date): void // pending & by===addressee → accept (mutual request = consent)
    readonly props, get isRemoved(): boolean, addresseeId, pullEvents()
  }
  // community.ts
  export type MemberRole = 'member' | 'editor' | 'admin'
  export class Community {
    static create(input: { ownerId: number; name: string; screenName: string; topic: Topic; description: string | null }, now?: Date): Community  // owner becomes admin, CommunityCreated
    static rehydrate(p: { id: number|null; screenName: string; name: string; description: string|null; topic: Topic; createdAt: Date; members: Map<number, MemberRole> }): Community
    join(userId: number): void           // idempotent; CommunityJoined only when new
    leave(userId: number): void          // not a member → no-op; last admin → LastAdminCannotLeave; else CommunityLeft
    roleOf(userId: number): MemberRole | null; adminCount(): number; assignId(id): void; pullEvents()
  }
  ```

- [ ] **Step 1: Failing tests**

```ts
// friendship.test.ts
import { describe, expect, it } from 'bun:test'
import { Friendship } from './friendship'

const t0 = new Date('2026-09-06T00:00:00Z')
describe('Friendship', () => {
  it('request orders the pair, is pending, emits FriendRequested', () => {
    const f = Friendship.request(7, 3, t0)
    expect(f.props).toMatchObject({ lo: 3, hi: 7, status: 'pending', requesterId: 7 })
    expect(f.addresseeId).toBe(3)
    expect(f.pullEvents().map((e) => e.type)).toEqual(['FriendRequested'])
  })
  it('rejects self', () => {
    expect(() => Friendship.request(1, 1)).toThrow(expect.objectContaining({ code: 'self_friendship' }))
  })
  it('accept by addressee → accepted + event; by requester → not_addressee; twice → no-op', () => {
    const f = Friendship.request(7, 3, t0); f.pullEvents()
    expect(() => f.accept(7)).toThrow(expect.objectContaining({ code: 'not_addressee' }))
    f.accept(3, t0)
    expect(f.props.status).toBe('accepted'); expect(f.props.acceptedAt).toEqual(t0)
    f.accept(3, t0)
    expect(f.pullEvents().map((e) => e.type)).toEqual(['FriendshipAccepted'])
  })
  it('decline by addressee → declined + FriendRequestDeclined', () => {
    const f = Friendship.request(7, 3); f.pullEvents(); f.decline(3)
    expect(f.props.status).toBe('declined')
    expect(f.pullEvents().map((e) => e.type)).toEqual(['FriendRequestDeclined'])
  })
  it('counterRequest by addressee accepts (mutual request = consent)', () => {
    const f = Friendship.request(7, 3); f.pullEvents(); f.counterRequest(3, t0)
    expect(f.props.status).toBe('accepted')
    expect(f.pullEvents().map((e) => e.type)).toEqual(['FriendshipAccepted'])
  })
  it('remove works only from accepted and emits FriendshipRemoved', () => {
    const f = Friendship.request(7, 3); f.accept(3); f.pullEvents(); f.remove(7)
    expect(f.isRemoved).toBe(true)
    expect(f.pullEvents()[0]).toMatchObject({ type: 'FriendshipRemoved', payload: { removedBy: 7, other: 3 } })
    const g = Friendship.request(1, 2)
    expect(() => g.remove(1)).toThrow(expect.objectContaining({ code: 'friendship_not_found' }))
  })
  it('cancel: requester withdraws a pending request silently; addressee cannot cancel', () => {
    const f = Friendship.request(7, 3); f.pullEvents()
    expect(() => f.cancel(3)).toThrow(expect.objectContaining({ code: 'not_addressee' }))
    f.cancel(7)
    expect(f.isRemoved).toBe(true); expect(f.pullEvents()).toEqual([])
  })
  it('rerequest after decline: other side within 24h → cooldown; after 24h → pending with new requester', () => {
    const f = Friendship.request(7, 3, t0); f.decline(3); f.pullEvents()
    expect(() => f.rerequest(7, new Date(t0.getTime() + 3600_000))).toThrow(expect.objectContaining({ code: 'request_cooldown' }))
    const later = new Date(t0.getTime() + 25 * 3600_000)
    f.rerequest(3, later)
    expect(f.props).toMatchObject({ status: 'pending', requesterId: 3, createdAt: later })
    expect(f.pullEvents().map((e) => e.type)).toEqual(['FriendRequested'])
  })
})
```

```ts
// community.test.ts
import { describe, expect, it } from 'bun:test'
import { Community } from './community'

describe('Community', () => {
  const mk = () => Community.create({ ownerId: 1, name: ' Кино ', screenName: 'kino_club', topic: 'cinema', description: null })
  it('creator is admin, name trimmed, CommunityCreated emitted', () => {
    const c = mk()
    expect(c.roleOf(1)).toBe('admin'); expect(c.props.name).toBe('Кино')
    expect(c.pullEvents().map((e) => e.type)).toEqual(['CommunityCreated'])
  })
  it('join is idempotent and emits once', () => {
    const c = mk(); c.pullEvents(); c.join(2); c.join(2)
    expect(c.roleOf(2)).toBe('member')
    expect(c.pullEvents().map((e) => e.type)).toEqual(['CommunityJoined'])
  })
  it('last admin cannot leave; member can; non-member leave is no-op', () => {
    const c = mk(); c.join(2); c.pullEvents()
    expect(() => c.leave(1)).toThrow(expect.objectContaining({ code: 'last_admin' }))
    c.leave(2); c.leave(9)
    expect(c.roleOf(2)).toBeNull()
    expect(c.pullEvents().map((e) => e.type)).toEqual(['CommunityLeft'])
  })
  it('rejects names shorter than 2 or longer than 120', () => {
    expect(() => Community.create({ ownerId: 1, name: 'x', screenName: 'ok_name', topic: 'it', description: null })).toThrow(expect.objectContaining({ code: 'invalid_community_name' }))
  })
})
```

- [ ] **Step 2: Run** — `bun test apps/api/src/modules/social-graph/domain` → FAIL.

- [ ] **Step 3: Implement** (`Topic` type from `../../../db/schema/enums` is a type-only import — allowed for domain? The boundaries test bans `drizzle-orm`, `elysia`, `ioredis`, `bun` and `/db/` paths from `domain`. So define `TOPICS`/`Topic` in `kernel/topics.ts` re-exporting the const from `db/schema/enums`… that also imports `/db/`. Instead move the `TOPICS` array to `packages/contracts/src/topics.ts` and have `db/schema/enums.ts` import it from `@vkc/contracts`; domain imports `Topic` from `@vkc/contracts`. Add `@vkc/contracts` to api dependencies (workspace). Check `packages/contracts` does not import `@vkc/api` at runtime — it imports only types (`import type { App }`), so no cycle at runtime; `bun install` handles workspace cycles for type-only use.)

```ts
// friendship.ts (core)
import type { DomainEvent } from '../../../kernel/event-bus'
import { FriendshipNotFound, NotRequestAddressee, RequestCooldown, SelfFriendshipError } from './errors'
import { orderPair } from './value-objects'

export type FriendshipStatus = 'pending' | 'accepted' | 'declined'
export type FriendshipProps = { lo: number; hi: number; status: FriendshipStatus; requesterId: number; createdAt: Date; acceptedAt: Date | null }
const COOLDOWN_MS = 24 * 3600_000

export class Friendship {
  private events: DomainEvent[] = []
  private removed = false
  private constructor(private p: FriendshipProps) {}
  static request(from: number, to: number, now = new Date()): Friendship {
    if (from === to) throw new SelfFriendshipError()
    const { lo, hi } = orderPair(from, to)
    const f = new Friendship({ lo, hi, status: 'pending', requesterId: from, createdAt: now, acceptedAt: null })
    f.events.push({ type: 'FriendRequested', occurredAt: now, payload: { requesterId: from, addresseeId: to } })
    return f
  }
  static rehydrate(p: FriendshipProps) { return new Friendship({ ...p }) }
  get props(): Readonly<FriendshipProps> { return this.p }
  get isRemoved() { return this.removed }
  get addresseeId() { return this.p.requesterId === this.p.lo ? this.p.hi : this.p.lo }
  private other(of: number) { return of === this.p.lo ? this.p.hi : this.p.lo }
  accept(by: number, now = new Date()): void {
    if (this.p.status === 'accepted') return
    if (this.p.status !== 'pending' || by !== this.addresseeId) throw new NotRequestAddressee()
    this.p.status = 'accepted'; this.p.acceptedAt = now
    this.events.push({ type: 'FriendshipAccepted', occurredAt: now, payload: { userLo: this.p.lo, userHi: this.p.hi, acceptedBy: by } })
  }
  counterRequest(by: number, now = new Date()): void { this.accept(by, now) }
  decline(by: number, now = new Date()): void {
    if (this.p.status !== 'pending' || by !== this.addresseeId) throw new NotRequestAddressee()
    this.p.status = 'declined'
    this.events.push({ type: 'FriendRequestDeclined', occurredAt: now, payload: { requesterId: this.p.requesterId, addresseeId: by } })
  }
  remove(by: number, now = new Date()): void {
    if (this.p.status !== 'accepted') throw new FriendshipNotFound()
    this.removed = true
    this.events.push({ type: 'FriendshipRemoved', occurredAt: now, payload: { removedBy: by, other: this.other(by) } })
  }
  cancel(by: number): void {
    if (this.p.status !== 'pending' || by !== this.p.requesterId) throw new NotRequestAddressee()
    this.removed = true
  }
  rerequest(by: number, now: Date): void {
    if (this.p.status !== 'declined') throw new NotRequestAddressee()
    if (now.getTime() - this.p.createdAt.getTime() < COOLDOWN_MS) throw new RequestCooldown()
    this.p.status = 'pending'; this.p.requesterId = by; this.p.createdAt = now; this.p.acceptedAt = null
    this.events.push({ type: 'FriendRequested', occurredAt: now, payload: { requesterId: by, addresseeId: this.other(by) } })
  }
  pullEvents() { const out = this.events; this.events = []; return out }
}
```

`community.ts` mirrors `User`: props + `members: Map<number, MemberRole>`; `create` validates via `CommunityName.create` and `ScreenName.create` (from `kernel/screen-name.ts`); `leave` checks `this.adminCount() === 1 && roleOf(userId) === 'admin'` → `LastAdminCannotLeave`. `errors.ts` uses `AppError` directly for 400 (`class SelfFriendshipError extends AppError { constructor() { super('self_friendship', 'Cannot befriend yourself', 400) } }`), `NotFoundError`/`ForbiddenError`/`ConflictError` for the rest with the exact codes from Global Constraints.

- [ ] **Step 4: Run** — `bun test apps/api/src/modules/social-graph/domain` → PASS; `bun test apps/api/src/modules/boundaries.test.ts` → PASS (domain imports only kernel + `@vkc/contracts`).

- [ ] **Step 5: Commit** — `feat(social-graph): Friendship and Community aggregates`

---

### Task 4: `social-graph` application — ports, DTOs, commands, queries, fakes, tests

**Files:**
- Create: `apps/api/src/modules/social-graph/application/{ports.ts,dto.ts,register.ts}`, `application/commands/{send-friend-request.ts,accept-friend-request.ts,decline-friend-request.ts,remove-friend.ts,follow-community.ts,unfollow-community.ts,create-community.ts,join-community.ts,leave-community.ts,hide-suggestion.ts}`, `application/queries/{get-relation.ts,get-friends.ts,get-friend-requests.ts,get-followers.ts,get-community.ts,get-community-members.ts,get-my-communities.ts,get-suggested-friends.ts,get-counters.ts,search-communities.ts,resolve-handle.ts}`, `application/testing/{fakes.ts,container.ts}`, `application/social-graph.application.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // dto.ts
  export type UserCellDto = { id: number; firstName: string; lastName: string; screenName: string | null; city: string | null; isVerified: boolean; lastSeenAt: string | null }
  export type Page<T> = { items: T[]; nextCursor: string | null }
  export type Membership = 'none' | 'member' | 'editor' | 'admin'
  export type CommunityDto = { id: number; screenName: string; name: string; description: string | null; topic: Topic; isVerified: boolean; membersCount: number; membership: Membership; isFollowing: boolean }
  export type CommunityCellDto = Pick<CommunityDto, 'id'|'screenName'|'name'|'topic'|'isVerified'|'membersCount'>
  export type SuggestionDto = UserCellDto & { mutual: number; sameCity: boolean }
  export type HandleDto = { kind: 'user' | 'community'; id: number }
  // ports.ts
  export interface FriendshipRepository { find(a: number, b: number): Promise<Friendship | null>; save(f: Friendship): Promise<void>; /* deletes when f.isRemoved; upsert otherwise; must throw on PK conflict as ConflictError('race') so handler retries once */ }
  export interface FollowRepository { add(followerId: number, target: { type: 'user'|'community'; id: number }): Promise<void>; remove(followerId: number, target: { type: 'user'|'community'; id: number }): Promise<void> }
  export interface CommunityRepository { findById(id: number): Promise<Community | null>; findByScreenName(s: string): Promise<Community | null>; save(c: Community): Promise<Community> }
  export interface SocialReadModel extends SocialReadPort { friends(userId, cursor): Promise<Page<UserCellDto>>; requests(me, dir: 'incoming'|'outgoing', cursor): Promise<Page<UserCellDto>>; followers(userId, cursor): Promise<Page<UserCellDto>>; community(idOrScreen: string, me: number|null): Promise<CommunityDto|null>; members(communityId, cursor): Promise<Page<UserCellDto>>; myCommunities(me): Promise<CommunityCellDto[]>; suggestions(me): Promise<SuggestionDto[]>; searchCommunities(q, limit): Promise<CommunityCellDto[]>; resolveHandle(handle: string): Promise<HandleDto|null> }
  export interface SuggestionCache { get(userId): Promise<SuggestionDto[]|null>; set(userId, items, ttlSeconds): Promise<void>; invalidate(userIds: number[]): Promise<void> }
  export interface SuggestionHider { hide(userId, hiddenId): Promise<void> }
  export const SOCIAL = { FriendshipRepository, FollowRepository, CommunityRepository, ReadModel, SuggestionCache, SuggestionHider }  // token<T>(...) each
  // commands (all `implements Command<R>`): SendFriendRequest({me,other}) → Relation; AcceptFriendRequest({me,other}) → Relation; DeclineFriendRequest → Relation; RemoveFriend → Relation;
  // FollowCommunity({me,communityId}) → { isFollowing: true }; UnfollowCommunity → { isFollowing: false }; CreateCommunity({me,name,screenName,topic,description}) → CommunityDto;
  // JoinCommunity({me,communityId}) → { membership, isFollowing }; LeaveCommunity → { membership: 'none', isFollowing: false }; HideSuggestion({me,other}) → void
  // queries: GetRelation(me|null, other) → Relation; GetFriends(userId, cursor?) → Page; GetFriendRequests(me, dir, cursor?); GetFollowers; GetCommunity(idOrScreen, me|null) → CommunityDto (CommunityNotFound);
  // GetCommunityMembers(id, cursor?); GetMyCommunities(me); GetSuggestedFriends(me) → SuggestionDto[] (cache-through, TTL 600); GetCounters(userId); SearchCommunities(q, limit=10); ResolveHandle(handle) → HandleDto (NotFoundError('not_found'))
  export async function registerSocialGraphHandlers(c: Container): Promise<void>
  export function createSocialGraphTestContainer(o?: { events?: EventBus; now?: () => Date }): Container   // fakes + fresh buses; also binds KERNEL.SocialRead to the fake read model
  ```
- Rules encoded in `SendFriendRequest`: load `find(me, other)`; none → `Friendship.request` + `follows.add(me, {type:'user', id: other})`; existing `pending` by other → `counterRequest(me)`; existing `pending` by me or `accepted` → return current relation (idempotent); `declined` → `rerequest(me, now)` (+follow add). Then `save`, publish events, `cache.invalidate([me, other])`. `AcceptFriendRequest`: `accept(me)`; requester's follow row stays (they were following); `cache.invalidate`. `DeclineFriendRequest`: `decline(me)` — follow row stays (VK semantics). `RemoveFriend`: if the row is `pending` and `me` is the requester → `cancel(me)` and `follows.remove(me, {type:'user', id: other})` (withdrawn request, no follow); if `accepted` → `remove(me)` then `follows.add(other, {type:'user', id: me})` (the removed side keeps following the remover); either way `save` deletes the row and returns `'none'`. `JoinCommunity` = `community.join` + `follows.add(me,{type:'community'})`; `LeaveCommunity` = `leave` + `follows.remove`.

- [ ] **Step 1: Failing application tests** (representative; write all listed)

```ts
// social-graph.application.test.ts
import { beforeEach, describe, expect, it } from 'bun:test'
import { EventBus } from '../../../kernel/event-bus'
import { KERNEL } from '../../../kernel/tokens'
import { AcceptFriendRequest } from './commands/accept-friend-request'
import { DeclineFriendRequest } from './commands/decline-friend-request'
import { RemoveFriend } from './commands/remove-friend'
import { SendFriendRequest } from './commands/send-friend-request'
import { CreateCommunity } from './commands/create-community'
import { JoinCommunity } from './commands/join-community'
import { LeaveCommunity } from './commands/leave-community'
import { HideSuggestion } from './commands/hide-suggestion'
import { GetRelation } from './queries/get-relation'
import { GetSuggestedFriends } from './queries/get-suggested-friends'
import { SOCIAL } from './ports'
import { registerSocialGraphHandlers } from './register'
import { createSocialGraphTestContainer } from './testing/container'
import type { InMemoryFollows, InMemorySocialRead, InMemorySuggestionCache } from './testing/fakes'

let c: ReturnType<typeof createSocialGraphTestContainer>, published: string[]
const exec = <T>(cmd: { __result: T }) => c.get(KERNEL.CommandBus).execute(cmd as never) as Promise<T>
const ask = <T>(q: { __result: T }) => c.get(KERNEL.QueryBus).ask(q as never) as Promise<T>
beforeEach(async () => {
  published = []
  const events = new EventBus()
  for (const t of ['FriendRequested','FriendshipAccepted','FriendRequestDeclined','FriendshipRemoved','CommunityCreated','CommunityJoined','CommunityLeft'])
    events.subscribe(t, (e) => { published.push(`${e.type}:${JSON.stringify(e.payload)}`) })
  c = createSocialGraphTestContainer({ events })
  await registerSocialGraphHandlers(c)
})

describe('friend requests', () => {
  it('request → outgoing/incoming relation, requester follows addressee, event published', async () => {
    expect(await exec(new SendFriendRequest({ me: 1, other: 2 }))).toBe('outgoing')
    expect(await ask(new GetRelation(2, 1))).toBe('incoming')
    expect((c.get(SOCIAL.FollowRepository) as InMemoryFollows).has(1, { type: 'user', id: 2 })).toBe(true)
    expect(published).toEqual(['FriendRequested:{"requesterId":1,"addresseeId":2}'])
  })
  it('accept → friends both ways, FriendshipAccepted published, follow row kept', async () => {
    await exec(new SendFriendRequest({ me: 1, other: 2 }))
    expect(await exec(new AcceptFriendRequest({ me: 2, other: 1 }))).toBe('friends')
    expect(await ask(new GetRelation(1, 2))).toBe('friends')
    expect(published.at(-1)).toContain('FriendshipAccepted')
  })
  it('accept by requester → 403 not_addressee', async () => {
    await exec(new SendFriendRequest({ me: 1, other: 2 }))
    await expect(exec(new AcceptFriendRequest({ me: 1, other: 2 }))).rejects.toMatchObject({ code: 'not_addressee' })
  })
  it('mutual request = accepted', async () => {
    await exec(new SendFriendRequest({ me: 1, other: 2 }))
    expect(await exec(new SendFriendRequest({ me: 2, other: 1 }))).toBe('friends')
  })
  it('decline keeps the follow and publishes no notification-worthy accept', async () => {
    await exec(new SendFriendRequest({ me: 1, other: 2 }))
    expect(await exec(new DeclineFriendRequest({ me: 2, other: 1 }))).toBe('none')
    expect((c.get(SOCIAL.FollowRepository) as InMemoryFollows).has(1, { type: 'user', id: 2 })).toBe(true)
    expect(await ask(new GetRelation(1, 2))).toBe('none')
  })
  it('re-request within 24h after decline → request_cooldown; after → outgoing again', async () => {
    const now = { t: new Date('2026-09-06T00:00:00Z') }
    c = createSocialGraphTestContainer({ now: () => now.t }); await registerSocialGraphHandlers(c)
    await exec(new SendFriendRequest({ me: 1, other: 2 })); await exec(new DeclineFriendRequest({ me: 2, other: 1 }))
    await expect(exec(new SendFriendRequest({ me: 1, other: 2 }))).rejects.toMatchObject({ code: 'request_cooldown' })
    now.t = new Date('2026-09-07T01:00:00Z')
    expect(await exec(new SendFriendRequest({ me: 1, other: 2 }))).toBe('outgoing')
  })
  it('remove on own pending request = cancel: none, follow removed, no event', async () => {
    await exec(new SendFriendRequest({ me: 1, other: 2 })); published.length = 0
    expect(await exec(new RemoveFriend({ me: 1, other: 2 }))).toBe('none')
    expect((c.get(SOCIAL.FollowRepository) as InMemoryFollows).has(1, { type: 'user', id: 2 })).toBe(false)
    expect(published).toEqual([])
  })
  it('remove → none, removed side now follows the remover', async () => {
    await exec(new SendFriendRequest({ me: 1, other: 2 })); await exec(new AcceptFriendRequest({ me: 2, other: 1 }))
    expect(await exec(new RemoveFriend({ me: 2, other: 1 }))).toBe('none')
    expect((c.get(SOCIAL.FollowRepository) as InMemoryFollows).has(1, { type: 'user', id: 2 })).toBe(true)
  })
  it('self request → 400', async () => {
    await expect(exec(new SendFriendRequest({ me: 1, other: 1 }))).rejects.toMatchObject({ code: 'self_friendship' })
  })
  it('graph changes invalidate the suggestion cache for both users', async () => {
    const cache = c.get(SOCIAL.SuggestionCache) as InMemorySuggestionCache
    await cache.set(1, [], 600); await cache.set(2, [], 600)
    await exec(new SendFriendRequest({ me: 1, other: 2 }))
    expect(await cache.get(1)).toBeNull(); expect(await cache.get(2)).toBeNull()
  })
})

describe('communities', () => {
  it('create → creator admin + member count 1; join/leave; last admin blocked', async () => {
    const dto = await exec(new CreateCommunity({ me: 1, name: 'Кино', screenName: 'kino', topic: 'cinema', description: null }))
    expect(dto).toMatchObject({ membership: 'admin', membersCount: 1, isFollowing: true })
    expect(await exec(new JoinCommunity({ me: 2, communityId: dto.id }))).toEqual({ membership: 'member', isFollowing: true })
    expect(await exec(new LeaveCommunity({ me: 2, communityId: dto.id }))).toEqual({ membership: 'none', isFollowing: false })
    await expect(exec(new LeaveCommunity({ me: 1, communityId: dto.id }))).rejects.toMatchObject({ code: 'last_admin' })
    expect(published.filter((p) => p.startsWith('Community')).map((p) => p.split(':')[0])).toEqual(['CommunityCreated', 'CommunityJoined', 'CommunityLeft'])
  })
  it('unknown community → 404', async () => {
    await expect(exec(new JoinCommunity({ me: 1, communityId: 999 }))).rejects.toMatchObject({ code: 'community_not_found' })
  })
})

describe('suggestions', () => {
  it('reads through the cache and hides', async () => {
    const read = c.get(SOCIAL.ReadModel) as InMemorySocialRead
    read.suggestionsFor.set(1, [{ id: 5, firstName: 'A', lastName: 'B', screenName: null, city: null, isVerified: false, lastSeenAt: null, mutual: 2, sameCity: false }])
    expect((await ask(new GetSuggestedFriends(1))).map((s) => s.id)).toEqual([5])
    read.suggestionsFor.set(1, [])                                  // cache should still serve
    expect((await ask(new GetSuggestedFriends(1))).map((s) => s.id)).toEqual([5])
    await exec(new HideSuggestion({ me: 1, other: 5 }))            // invalidates
    expect(await ask(new GetSuggestedFriends(1))).toEqual([])
  })
})
```

- [ ] **Step 2: Run** — FAIL (modules missing).

- [ ] **Step 3: Implement.** Fakes: `InMemoryFriendships` (Map keyed `lo:hi`), `InMemoryFollows` (Set of `follower|type|id`, `has()`), `InMemoryCommunities`, `InMemorySocialRead` (computes `relation` from `InMemoryFriendships`, `counters`, and exposes `suggestionsFor: Map<number, SuggestionDto[]>`; other methods return empty pages), `InMemorySuggestionCache` (Map, ignores TTL), `InMemorySuggestionHider` (Set). Container binds `SOCIAL.*`, `KERNEL.CommandBus/QueryBus/EventBus`, `KERNEL.SocialRead` → same read fake, and a `SOCIAL.Clock` token `{ now(): Date }` (add to ports) bound to `o.now ?? (() => new Date())` so cooldown tests are deterministic. Handlers follow identity's pattern (`export class X implements Command<R> { declare readonly __result: R; constructor(readonly input: …) {} }` + `export const xHandler = (d: Deps) => async (cmd: X) => {…}`). `register.ts` resolves all ports once and registers ten commands + eleven queries. `GetSuggestedFriends` handler: `cache.get(me) ?? (await read.suggestions(me), cache.set(me, items, 600))`.

- [ ] **Step 4: Run** — `bun test apps/api/src/modules/social-graph` PASS; boundaries PASS; `bun run typecheck`.

- [ ] **Step 5: Commit** — `feat(social-graph): application layer — commands, queries, ports, in-memory fakes`

---

### Task 5: `social-graph` infrastructure — Drizzle repositories, read model SQL (incl. PYMK and search), Redis cache, container, integration tests

**Files:**
- Create: `infrastructure/{drizzle-friendship-repository.ts,drizzle-follow-repository.ts,drizzle-community-repository.ts,drizzle-social-read-model.ts,pymk.sql.ts,redis-suggestion-cache.ts,drizzle-suggestion-hider.ts,social-graph.container.ts}`, `infrastructure/social-graph.infrastructure.test.ts`, `apps/api/test/helpers/graph-fixture.ts`
- Modify: `apps/api/src/modules/social-graph/index.ts` (create: `bindSocialGraph(c)`, `mountSocialGraph(c)` — routes come in Task 8, so `mount` returns handlers registration only for now), `apps/api/src/app.ts` (call `bindSocialGraph` before `bindIdentity`… order: all binds, then mounts)

**Interfaces:**
- Produces: `bindSocialGraph(c)` binds `SOCIAL.*` and `KERNEL.SocialRead` (to the same `DrizzleSocialReadModel` instance); `graphFixture(db, { users: 30 })` test helper inserting users/friendships/follows/communities for read-model tests (deterministic, no seeder).

- [ ] **Step 1: Failing infrastructure tests**

```ts
// social-graph.infrastructure.test.ts (excerpt: the read-model and PYMK parts)
describe('DrizzleSocialReadModel', () => {
  it('relation/counters/friends/requests/followers agree with fixture', async () => {
    const f = await graphFixture(db)           // users 1..30; 1↔2..11 accepted; 12→1 pending; 1→13 pending; 14 follows 1
    const rm = new DrizzleSocialReadModel(db)
    expect(await rm.relation(1, 2)).toBe('friends'); expect(await rm.relation(1, 12)).toBe('incoming'); expect(await rm.relation(1, 13)).toBe('outgoing'); expect(await rm.relation(1, 1)).toBe('self'); expect(await rm.relation(null, 1)).toBe('none')
    expect(await rm.counters(1)).toEqual({ friends: 10, followers: 13 /* 10 friends? no: followers = follows(user,1) rows = 12 (pending requester) + 14 + 10 friends' follow rows inserted by fixture */, communities: f.communitiesOf1, incomingRequests: 1 })
    const p1 = await rm.friends(1, null); expect(p1.items).toHaveLength(10); expect(p1.nextCursor).toBeNull()
    expect((await rm.requests(1, 'incoming', null)).items.map((u) => u.id)).toEqual([12])
    expect((await rm.requests(1, 'outgoing', null)).items.map((u) => u.id)).toEqual([13])
  })
  it('paginates friends by (created_at desc, id desc) with an opaque cursor', async () => {
    await graphFixture(db, { friendsOf1: 45 })
    const rm = new DrizzleSocialReadModel(db)
    const a = await rm.friends(1, null); const b = await rm.friends(1, a.nextCursor); const c3 = await rm.friends(1, b.nextCursor)
    expect([a.items.length, b.items.length, c3.items.length]).toEqual([20, 20, 5]); expect(c3.nextCursor).toBeNull()
    expect(new Set([...a.items, ...b.items, ...c3.items].map((u) => u.id)).size).toBe(45)
  })
  it('suggestions: friends-of-friends ranked by mutual, excludes self/friends/pending/hidden, caps 20, uses index scans', async () => {
    await graphFixture(db, { pymk: true })      // fixture: 1 friends with 2..6; 7 friends with 2,3,4 (mutual 3); 8 friends with 2 (mutual 1); 9 pending with 1; 10 hidden by 1; 11 same city + shared topic, no friends
    const rm = new DrizzleSocialReadModel(db)
    const s = await rm.suggestions(1)
    expect(s.map((x) => x.id)).toEqual([7, 8, 11]); expect(s[0]).toMatchObject({ mutual: 3 })
    expect(s.find((x) => x.id === 9)).toBeUndefined(); expect(s.find((x) => x.id === 10)).toBeUndefined()
    const plan = await db.execute<{ 'QUERY PLAN': unknown }>(sql.raw(`EXPLAIN (FORMAT JSON) ${PYMK_SQL.replace(/\$1/g, '1')}`))
    expect(JSON.stringify(plan)).not.toContain('"Seq Scan","Parallel Aware":false,"Async Capable":false,"Relation Name":"friendships"')
  })
  it('searchCommunities and screen-name resolve', async () => {
    await graphFixture(db)
    const rm = new DrizzleSocialReadModel(db)
    expect((await rm.searchCommunities('кин', 10)).map((c) => c.screenName)).toContain('kino')
    expect(await rm.resolveHandle('kino')).toEqual({ kind: 'community', id: expect.any(Number) })
    expect(await rm.resolveHandle('id1')).toEqual({ kind: 'user', id: 1 }); expect(await rm.resolveHandle('nobody')).toBeNull()
  })
})
describe('RedisSuggestionCache', () => {
  it('set/get/invalidate with TTL', async () => {
    const cache = new RedisSuggestionCache(redis)
    await cache.set(1, [], 600); expect(await cache.get(1)).toEqual([]); expect(await redis.ttl('pymk:1')).toBeGreaterThan(500)
    await cache.invalidate([1]); expect(await cache.get(1)).toBeNull()
  })
})
describe('DrizzleFriendshipRepository', () => {
  it('save inserts/updates/deletes and maps PK race to ConflictError(race)', async () => { /* insert twice concurrently → one ConflictError */ })
})
```
Write the fixture helper first (`apps/api/test/helpers/graph-fixture.ts`) with explicit inserts through `db.insert(users)...` so the numbers asserted above are exact; adjust the `followers` expectation to what the fixture actually inserts and document it in the fixture's doc comment.

- [ ] **Step 2: Run** — `bun test apps/api/src/modules/social-graph/infrastructure` → FAIL.

- [ ] **Step 3: Implement.** Key SQL:

```ts
// pymk.sql.ts — $1 = me
export const PYMK_SQL = `
with me_friends as (
  select case when user_lo = $1 then user_hi else user_lo end as fid
  from friendships where status = 'accepted' and (user_lo = $1 or user_hi = $1)
), excluded as (
  select fid as uid from me_friends
  union select case when user_lo = $1 then user_hi else user_lo end from friendships where (user_lo = $1 or user_hi = $1)
  union select hidden_id from friend_suggestion_hidden where user_id = $1
  union select $1
), fof as (
  select case when f.user_lo = mf.fid then f.user_hi else f.user_lo end as uid, count(*)::int as mutual
  from me_friends mf join friendships f on f.status = 'accepted' and (f.user_lo = mf.fid or f.user_hi = mf.fid)
  group by 1 order by mutual desc limit 200
), my_comms as (
  select cm.community_id from community_members cm join communities c on c.id = cm.community_id
  where cm.user_id = $1 order by c.members_count asc limit 5
), comm as (
  select cm.user_id as uid, count(*)::int as shared_communities
  from my_comms mc join community_members cm on cm.community_id = mc.community_id group by 1
), me as (select city from users where id = $1),
my_topics as (
  select distinct c.topic from follows fl join communities c on c.id = fl.target_id
  where fl.follower_id = $1 and fl.target_type = 'community'
), city as (
  select u.id as uid, count(distinct c.topic)::int as shared_topics
  from users u, me
  left join follows fl on fl.follower_id = u.id and fl.target_type = 'community'
  left join communities c on c.id = fl.target_id and c.topic in (select topic from my_topics)
  where u.city = me.city and u.id <> $1 group by u.id limit 100
), cand as (
  select uid from fof union select uid from comm union select uid from city
)
select u.id, u.first_name as "firstName", u.last_name as "lastName", u.screen_name as "screenName", u.city, u.is_verified as "isVerified", u.last_seen_at as "lastSeenAt",
  coalesce(fof.mutual, 0) as mutual, (u.city is not distinct from me.city) as "sameCity",
  3*coalesce(fof.mutual,0) + 2*coalesce(comm.shared_communities,0) + (case when u.city is not distinct from me.city then 1 else 0 end) + 0.5*coalesce(city.shared_topics,0) as score
from cand join users u on u.id = cand.uid cross join me
left join fof on fof.uid = cand.uid left join comm on comm.uid = cand.uid left join city on city.uid = cand.uid
where cand.uid not in (select uid from excluded)
order by score desc, u.id asc limit 20`
```
Execute with `db.execute(sql.raw(...))`? No — parameterised: `db.$client.unsafe(PYMK_SQL, [me])` (Bun SQL) or `sql` template with `${me}` substituted for every `$1`. Use a small helper `rawQuery<T>(db, PYMK_SQL, [me])` in `infrastructure/raw.ts` built on `db.$client.unsafe`.

Read model pagination (friends): `where (created_at, id) < ($cursorTs, $cursorId)` ordered `created_at desc, id desc` limit `PAGE_SIZE + 1`; `nextCursor` from the 21st row. Relation: one query selecting the row for `(lo,hi)`, then map: none → `'none'`, `accepted` → `'friends'`, `pending` & `requester_id = me` → `'outgoing'`, `pending` & other → `'incoming'`, `declined` → `'none'`, `me === other` → `'self'`, `me === null` → `'none'`. Search communities: `where similarity(lower(name), lower($q)) > 0.2 or lower(name) like lower($q) || '%' order by similarity desc, members_count desc limit $limit`. `resolveHandle`: regex `^id(\d+)$` → user by id exists?; `^club(\d+)$` → community by id; else `users.screen_name` then `communities.screen_name`.

`DrizzleFriendshipRepository.save`: if `f.isRemoved` → `delete`; else `insert ... onConflictDoUpdate({ target: [lo, hi], set: { status, requesterId, createdAt, acceptedAt } })` — the insert itself is the race arbiter, so no `ConflictError('race')` is needed; drop that from the port comment (record in spec §9). `RedisSuggestionCache`: `get` → `JSON.parse`, `set` with `EX`, `invalidate` → `del` of all keys. Container:

```ts
export function bindSocialGraph(c: Container): void {
  c.bind(SOCIAL.FriendshipRepository).toResolvedValue((db) => new DrizzleFriendshipRepository(db), [KERNEL.Db])
  c.bind(SOCIAL.FollowRepository).toResolvedValue((db) => new DrizzleFollowRepository(db), [KERNEL.Db])
  c.bind(SOCIAL.CommunityRepository).toResolvedValue((db) => new DrizzleCommunityRepository(db), [KERNEL.Db])
  c.bind(SOCIAL.ReadModel).toResolvedValue((db) => new DrizzleSocialReadModel(db), [KERNEL.Db])
  c.bind(KERNEL.SocialRead).toResolvedValue((rm) => rm, [SOCIAL.ReadModel])
  c.bind(SOCIAL.SuggestionCache).toResolvedValue((r) => new RedisSuggestionCache(r), [KERNEL.Redis])
  c.bind(SOCIAL.SuggestionHider).toResolvedValue((db) => new DrizzleSuggestionHider(db), [KERNEL.Db])
  c.bind(SOCIAL.Clock).toConstantValue({ now: () => new Date() })
}
```

- [ ] **Step 4: Run** — infrastructure tests, `bun run test:integration`, typecheck, lint.

- [ ] **Step 5: Commit** — `feat(social-graph): Drizzle/Redis infrastructure, PYMK and search SQL`

---

### Task 6: `identity` extension — `UpdateProfile`, `GetProfile`, `SearchUsers`

**Files:**
- Modify: `domain/user.ts` (props + `updateProfile`), `application/dto.ts` (`ProfileDto`), `application/ports.ts` (`UserReadModel.getProfile`, `searchUsers`; `UserRepository.findByScreenName`), `application/register.ts`, `infrastructure/drizzle-user-repository.ts` (map new columns, `23505` on `users_screen_name_uq` → `ConflictError('screen_name_taken')`), `infrastructure/drizzle-user-read-model.ts`, `application/testing/fakes.ts`, `application/identity.application.test.ts`, `infrastructure/identity.infrastructure.test.ts`
- Create: `application/commands/update-profile.ts`, `application/queries/get-profile.ts`, `application/queries/search-users.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ProfileDto = UserDto & { status: string | null; bio: string | null; city: string | null; birthday: string | null; isVerified: boolean; counters: Counters; relation: Relation }
  export class UpdateProfile implements Command<ProfileDto> { constructor(readonly input: { me: number; status?: string | null; bio?: string | null; city?: string | null; birthday?: string | null; screenName?: string | null }) }
  export class GetProfile implements Query<ProfileDto> { constructor(readonly idOrScreen: string, readonly viewer: number | null) }
  export class SearchUsers implements Query<UserCellDto[]> { constructor(readonly q: string, readonly limit = 10) }
  User.updateProfile(patch): void  // status ≤140 (DomainRuleError 'status_too_long'), bio ≤ 2000, city must be in CITIES or null ('invalid_city'), birthday ISO date ≤ today and ≥ 1900 ('invalid_birthday'), screenName via ScreenName.create or null
  UserReadModel.getProfile(idOrScreen: string): Promise<Omit<ProfileDto,'counters'|'relation'> | null>; searchUsers(q, limit): Promise<UserCellDto[]>
  ```
- `getProfileHandler` deps: `{ usersRead, social: SocialReadPort }` — social resolved lazily inside the handler via `() => c.get(KERNEL.SocialRead)` because binds are complete only after all `bind*` calls (app.ts order guarantees it, but lazy access keeps the test container simple: bind a fake `SocialReadPort` in `createIdentityTestContainer` returning `{ relation: 'none', counters: zeros }`).

- [ ] **Step 1: Failing tests** — application: `UpdateProfile` sets fields and returns DTO; screen name reserved → 422; `status` 141 chars → 422; `GetProfile('id1', 2)` returns relation from the social fake; unknown → 404 `user_not_found`; `SearchUsers` fake returns by prefix. Infrastructure: `updateProfile` persists and `screen_name` duplicate → 409 `screen_name_taken`; `searchUsers('Ден')` finds `Денис` via trigram; `getProfile('denis')` by screen name.

- [ ] **Step 2: Run to fail.** **Step 3: Implement** (columns `status, bio, city, birthday, isVerified` added to `UserProps` and both mappers; `toProfileDto`). **Step 4: Run** unit + integration. **Step 5: Commit** — `feat(identity): profile editing, GetProfile with social counters, trigram user search`

---

### Task 7: `notifications` module

**Files:**
- Create: `modules/notifications/application/{ports.ts,dto.ts,register.ts,commands/mark-read.ts,queries/get-unread-count.ts,queries/get-notifications.ts,subscribers/graph-subscriber.ts,testing/fakes.ts,testing/container.ts,notifications.application.test.ts}`, `infrastructure/{drizzle-notification-repository.ts,drizzle-notification-read-model.ts,notifications.container.ts,notifications.infrastructure.test.ts}`, `index.ts` (`bindNotifications`, `mountNotifications` registers handlers + subscribers; routes in Task 8)

**Interfaces:**
- Produces:
  ```ts
  export type NotificationDto = { id: number; kind: NotificationKind; createdAt: string; readAt: string | null; actor: UserCellDto | null; payload: Record<string, unknown> }
  export interface NotificationRepository { insert(rows: { userId: number; kind: NotificationKind; actorId: number | null; groupKey?: string | null; payload?: Record<string, unknown> }[]): Promise<void>; markRead(userId: number, uptoId: number): Promise<void> }
  export interface NotificationReadModel { unreadCount(userId: number): Promise<number>; list(userId: number, cursor: string | null): Promise<Page<NotificationDto>> }
  export const NOTIFICATIONS = { Repository, ReadModel }
  export class MarkNotificationsRead implements Command<{ count: number }> { constructor(readonly input: { me: number; uptoId: number }) }
  export class GetUnreadCount implements Query<{ count: number }>; export class GetNotifications implements Query<Page<NotificationDto>>
  export function subscribeGraphNotifications(events: EventBus, repo: NotificationRepository): void
    // FriendRequested → { userId: addresseeId, kind: 'friend_request', actorId: requesterId }
    // FriendshipAccepted → { userId: requester (the one who is NOT acceptedBy), kind: 'friend_accepted', actorId: acceptedBy }
    // FriendRequestDeclined / FriendshipRemoved → nothing
  ```
- Note: `FriendshipAccepted` payload carries `userLo, userHi, acceptedBy`; requester = the other one.

- [ ] **Step 1: Failing tests** — application: publishing `FriendRequested` on the bus inserts a `friend_request` for the addressee; `FriendshipAccepted` inserts `friend_accepted` for the requester; declined inserts nothing; `MarkNotificationsRead(uptoId)` marks only `id <= uptoId` and returns the new unread count; list pagination by cursor. Infrastructure: insert two rows, `unreadCount` 2, `markRead(upto first)` → 1, `list` returns actor joined `{ id, firstName, lastName, screenName, city, isVerified, lastSeenAt }`.

- [ ] **Steps 2–5**: fail → implement (read model joins `users` on `actor_id`; `markRead` = `update ... set read_at = now() where user_id = $1 and id <= $2 and read_at is null`) → pass → commit `feat(notifications): module with graph event subscriber, unread count, cursor list`.

---

### Task 8: Presentation — routes for social-graph, notifications, identity profile; HTTP e2e; contracts

**Files:**
- Create: `modules/social-graph/presentation/routes.ts`, `modules/social-graph/presentation/social.e2e.test.ts`, `modules/notifications/presentation/routes.ts`, `modules/notifications/presentation/notifications.e2e.test.ts`, `apps/api/src/modules/dto.ts` (re-exports all public DTO types for contracts)
- Modify: `modules/identity/presentation/routes.ts` (+`GET /users/:idOrScreen`, `PATCH /me/profile`, `GET /search` users part merged in social routes — decide: social-graph owns `GET /search` and asks identity via `QueryBus` (`SearchUsers` is a query class exported from identity's public `index.ts`; the presentation may import another module's public `index.ts`? boundaries test forbids importing another module's inner layers, so export `SearchUsers` from `modules/identity/index.ts` and import from `'../../identity'`), `modules/{social-graph,notifications,identity}/index.ts` (mount returns plugin), `app.ts` (`.use(social).use(notifications)`), `apps/api/package.json` (`"./dto": "./src/modules/dto.ts"`), `packages/contracts/src/index.ts` (re-export DTO types)

**Route table:** exactly the spec's §4.2 table. All `t.Object` schemas explicit; cursor query `t.Optional(t.String())`; `:idOrScreen` params `t.String()`; profile and community `GET` use `optionalAuth: true` and pass `viewer?.id ?? null`.

- [ ] **Step 1: Failing HTTP e2e** (`social.e2e.test.ts`, uses `createTestApp`, registers users A and B via `/auth/register`, keeps cookies):
  - request → `{ relation: 'outgoing' }`; B `GET /me/friends/requests?dir=incoming` lists A; B accept → `friends`; `GET /users/idA` by B has `relation: 'friends'` and `counters.friends: 1`.
  - mutual race: A and B `POST /friends/:other/request` via `Promise.all` → both 200, final relation `friends`, exactly one `friendships` row.
  - `PATCH /me/profile { screenName: 'feed' }` → 422 `screen_name_reserved`; taken by other → 409 `screen_name_taken`; success then `GET /users/<screenName>` resolves.
  - communities: create 201 → join by B → members 2 → A leave → 409 `last_admin`; `GET /search?q=<name>` returns it under `communities` and user A under `users`.
  - notifications: after request+accept, B has unread 1 (`friend_request`), A has unread 1 (`friend_accepted`); `POST /me/notifications/read { uptoId }` → `{ count: 0 }`.
  - pagination: create 25 friendships for A via direct SQL fixture helper → `GET /users/idA/friends` 20 + `nextCursor`, second page 5.
  - bad cursor → 422 `bad_cursor`.
- [ ] **Step 2: Run to fail.** **Step 3: Implement routes + wiring** (`app.ts`: `bindIdentity(c); bindSocialGraph(c); bindNotifications(c); const [identity, social, notif] = [await mountIdentity(c), await mountSocialGraph(c), await mountNotifications(c)]`). **Step 4: Run** `bun run test:integration`, `bun run --filter @vkc/contracts typecheck`. **Step 5: Commit** — `feat(api): social graph, profile and notifications HTTP routes with e2e`.

---

### Task 9: Frontend shared — `TabCoordinator`, query keys, cursor helper, `useDelayedPending`, cities

**Files:**
- Create: `apps/web/src/shared/lib/tabs/{ports.ts,browser.ts,testing.ts,index.ts,tabs.test.ts}`, `apps/web/src/shared/lib/query-keys.ts`, `apps/web/src/shared/lib/use-delayed-pending.ts` (+`.test.tsx`), `apps/web/src/shared/lib/cursor.ts`, `apps/web/src/shared/config/cities.ts`
- Modify: `apps/web/src/shared/lib/index.ts`, `apps/web/src/shared/config/index.ts`

**Interfaces:**
- Produces:
  ```ts
  export type TabMessage = { type: 'notifications:changed'; unread: number } | { type: 'notifications:read'; uptoId: number } | { type: 'tab:active'; tabId: string; active: boolean }
  export interface TabCoordinator { readonly tabId: string; isLeader(): boolean; onLeaderChange(cb: (leader: boolean) => void): () => void; isActive(): boolean; onActiveChange(cb: (active: boolean) => void): () => void; broadcast(msg: TabMessage): void; subscribe(cb: (msg: TabMessage) => void): () => void }
  export const TAB_COORDINATOR: ServiceIdentifier<TabCoordinator>
  export function createBrowserTabCoordinator(): TabCoordinator
  export function fakeTabCluster(n: number): { tabs: TabCoordinator[]; close(i: number): void; focus(i: number): void; blurAll(): void }
  export function pickAnnouncer(s: { isLeader: boolean; isActive: boolean; anyActive: boolean }): boolean   // active tab announces; if none active, leader does
  export const queryKeys = { user: { profile: (h: string) => ['user', h] as const, friends: (id: number) => ['friends', id] as const, followers: (id) => …, counters: (id) => ['counters', id] as const, relation: (id) => ['relation', id] as const, requests: (dir: 'incoming'|'outgoing') => ['requests', dir] as const, suggestions: ['suggestions'] as const }, community: { get: (h) => ['community', h] as const, members: (id) => …, mine: ['communities','mine'] as const }, notifications: { unread: ['notifications','unread'] as const, list: ['notifications','list'] as const }, search: (q: string, kind: string) => ['search', kind, q] as const }
  export function useDelayedPending(isPending: boolean, delayMs = 150): boolean
  export type Page<T> = { items: T[]; nextCursor: string | null }
  export { CITIES } from '@vkc/contracts'  // shared/config/cities.ts
  ```

- [ ] **Step 1: Failing tests**

```ts
// tabs.test.ts
import { describe, expect, it, vi } from 'vitest'
import { fakeTabCluster, pickAnnouncer } from './testing'

describe('fakeTabCluster', () => {
  it('exactly one leader; closing the leader promotes the next', () => {
    const c = fakeTabCluster(3)
    expect(c.tabs.filter((t) => t.isLeader())).toHaveLength(1)
    const onChange = vi.fn(); c.tabs[1]!.onLeaderChange(onChange)
    c.close(0)
    expect(c.tabs[1]!.isLeader()).toBe(true); expect(onChange).toHaveBeenCalledWith(true)
  })
  it('broadcast reaches every other tab, not the sender', () => {
    const c = fakeTabCluster(2); const got = vi.fn(); c.tabs[1]!.subscribe(got); const self = vi.fn(); c.tabs[0]!.subscribe(self)
    c.tabs[0]!.broadcast({ type: 'notifications:changed', unread: 3 })
    expect(got).toHaveBeenCalledWith({ type: 'notifications:changed', unread: 3 }); expect(self).not.toHaveBeenCalled()
  })
  it('focus marks one tab active and notifies', () => {
    const c = fakeTabCluster(2); const cb = vi.fn(); c.tabs[1]!.onActiveChange(cb); c.focus(1)
    expect(c.tabs[1]!.isActive()).toBe(true); expect(c.tabs[0]!.isActive()).toBe(false); expect(cb).toHaveBeenCalledWith(true)
  })
})
describe('pickAnnouncer', () => {
  it.each([
    [{ isLeader: true, isActive: true, anyActive: true }, true],
    [{ isLeader: false, isActive: true, anyActive: true }, true],
    [{ isLeader: true, isActive: false, anyActive: true }, false],
    [{ isLeader: true, isActive: false, anyActive: false }, true],
    [{ isLeader: false, isActive: false, anyActive: false }, false],
  ])('%o → %s', (s, want) => { expect(pickAnnouncer(s)).toBe(want) })
})
```
`use-delayed-pending.test.tsx`: with fake timers, `isPending=true` → `false` until 150 ms, then `true`; flipping to `false` before 150 ms never shows; flipping to `false` after showing hides immediately.

- [ ] **Step 2: Run to fail.** **Step 3: Implement.** Browser coordinator: `tabId = crypto.randomUUID()`; leader via `navigator.locks?.request('vkc-leader', () => { leader = true; notify(); return new Promise<void>(() => {}) })`, fallback `leader = true` when `navigator.locks` is undefined; `BroadcastChannel('vkc')` for `broadcast/subscribe` (also relays `tab:active`); `isActive = document.visibilityState === 'visible' && document.hasFocus()`, listeners on `visibilitychange`, `focus`, `blur`. Fake cluster: shared array bus, leader = lowest open index, `close(i)` re-elects and fires callbacks. `pickAnnouncer` in `ports.ts`-adjacent `announcer.ts` (pure).

- [ ] **Step 4: Run** `bunx vitest run src/shared`, lint, typecheck. **Step 5: Commit** — `feat(web): TabCoordinator port with browser and fake implementations; query keys; useDelayedPending`.

---

### Task 10: Frontend entities — `user`, `community`, `notification` (types, gateways, cells, skeletons, kinds) + composition bindings

**Files:**
- Create: `entities/user/{model/types.ts (replace),model/ports.ts,api/userApi.ts (+test),ui/UserCell.tsx (+test),ui/UserCellSkeleton.tsx}`, `entities/community/{model/types.ts,model/ports.ts,api/communityApi.ts (+test),ui/CommunityCell.tsx (+test),ui/CommunityCellSkeleton.tsx,index.ts}`, `entities/notification/{model/types.ts,model/kinds.ts (+test),model/ports.ts,api/notificationApi.ts (+test),ui/NotificationItem.tsx (+test),index.ts}`
- Modify: `entities/user/index.ts`, `app/composition/container.ts` (bind `USER_GATEWAY`, `COMMUNITY_GATEWAY`, `NOTIFICATION_GATEWAY`, `TAB_COORDINATOR`), `app/composition/container.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // entities/user
  export type { ProfileDto, UserCellDto, Relation, Counters, Page } from '@vkc/contracts'
  export interface UserGateway { getProfile(handle: string): Promise<ProfileDto>; getFriends(userId: number, cursor: string | null): Promise<Page<UserCellDto>>; getFollowers(...): Promise<Page<UserCellDto>>; getRequests(dir: 'incoming'|'outgoing', cursor: string|null): Promise<Page<UserCellDto>>; getCounters(userId: number): Promise<Counters>; searchUsers(q: string): Promise<UserCellDto[]>; updateProfile(patch: ProfilePatch): Promise<ProfileDto> }
  export const USER_GATEWAY: ServiceIdentifier<UserGateway>; export class EdenUserGateway implements UserGateway { constructor(api: ApiClient, bus: UnauthorizedBus) }
  export function UserCell(props: { user: UserCellDto; after?: ReactNode; subtitle?: string }): JSX  // SimpleCell Component={RouterAnchor} href={`/${user.screenName ?? `id${user.id}`}`} before={<UserAvatar size=48/>} subtitle={subtitle ?? user.city ?? undefined}
  export function UserCellSkeleton(props: { rows?: number }): JSX  // Group of `rows` SimpleCell with Skeleton circle 48 + Skeleton text; container aria-busy aria-label="Загрузка"
  export function userHandle(u: Pick<UserCellDto,'id'|'screenName'>): string  // `screenName ?? id${id}`
  // entities/community
  export type { CommunityDto, CommunityCellDto, Membership }
  export interface CommunityGateway { get(handle: string): Promise<CommunityDto>; members(id, cursor): Promise<Page<UserCellDto>>; mine(): Promise<CommunityCellDto[]>; search(q): Promise<CommunityCellDto[]>; create(input): Promise<CommunityDto>; join(id): Promise<{ membership: Membership; isFollowing: boolean }>; leave(id): Promise<…>; follow(id): Promise<{ isFollowing: boolean }>; unfollow(id) }
  export const COMMUNITY_GATEWAY; export class EdenCommunityGateway; export function CommunityCell({ community }); CommunityCellSkeleton; communityHandle(c) // `c.screenName` (always set) 
  // entities/notification
  export type { NotificationDto, NotificationKind }
  export interface NotificationGateway { unreadCount(): Promise<number>; list(cursor: string|null): Promise<Page<NotificationDto>>; markRead(uptoId: number): Promise<number> }
  export const NOTIFICATION_GATEWAY; export class EdenNotificationGateway
  export function describeNotification(n: NotificationDto): { Icon: ComponentType; text: string; href: string }   // table for all 12 kinds + fallback
  export function NotificationItem({ notification }): JSX  // RichCell before={actor ? <UserAvatar/> : <Icon28NotificationOutline/>} caption={relative time} Component={RouterAnchor} href; unread → `after={<Badge/>}` … use VKUI `Badge mode="prominent"` for unread dot
  ```
- `describeNotification` texts (Russian, actor name prefixed when actor present): `friend_request` «хочет добавить вас в друзья» → `/friends?tab=requests`; `friend_accepted` «принял(а) вашу заявку» → actor profile; `new_follower` «подписался(ась) на вас» → actor profile; `community_invite` «приглашает в сообщество {communityName}» → `/${communityScreenName ?? `club${communityId}`}`; `post_like` «оценил(а) вашу запись» → `/post{postId}`; `comment_like` «оценил(а) ваш комментарий»; `post_comment` «прокомментировал(а) вашу запись»; `comment_reply` «ответил(а) на ваш комментарий»; `mention` «упомянул(а) вас»; `repost` «поделился(ась) вашей записью»; `community_post` «новая запись в сообществе»; `birthday` «сегодня день рождения» → actor profile; unknown → «Новое уведомление» → `/notifications`. Icons: `Icon28UserAddOutline`, `Icon28UsersOutline`, `Icon28LikeOutline`, `Icon28CommentOutline`, `Icon28MentionOutline`, `Icon28ShareOutline`, `Icon28GiftOutline`, `Icon28NotificationOutline` (verify each exists in `@vkontakte/icons`; substitute the closest existing name if not and note it in the report).

- [ ] **Step 1: Failing tests** — `kinds.test.ts` table over all 12 kinds + unknown (text contains the actor's first name, href as specified); `UserCell.test.tsx` renders link to `/id5` when no screen name and to `/den` when set, shows city subtitle; `UserCellSkeleton` has `aria-busy`; `userApi.test.ts` with fake `ApiClient` (pattern from `entities/session/api/sessionApi.test.ts`): `getProfile('den')` calls `api.api.v1.users({ idOrScreen: 'den' }).get()` (Eden path params are function calls — check the generated client shape in `node_modules/@elysia/eden` types by writing the call and letting `tsc` guide) and 401 emits on the bus; `container.test.ts` extended: all new tokens resolve, `TAB_COORDINATOR` singleton.
- [ ] **Steps 2–5**: fail → implement → `bunx vitest run src/entities src/app` + lint (Steiger: new slices need `index.ts`) → commit `feat(web): user, community and notification entities with gateways, cells and skeletons`.

---

### Task 11: Features `friendship`, `suggestions`, `community-membership`

**Files:**
- Create: `features/friendship/{model/{ports.ts,useFriendAction.ts,errors.ts,testing.ts},api/friendshipApi.ts (+test),ui/FriendButton.tsx (+test),index.ts}`, `features/suggestions/{model/{useSuggestions.ts,useHideSuggestion.ts,ports.ts,testing.ts},api/suggestionsApi.ts,ui/SuggestionCard.tsx (+test),ui/SuggestionCardSkeleton.tsx,index.ts}`, `features/community-membership/{model/{useJoinCommunity.ts,useFollowCommunity.ts},ui/JoinButton.tsx (+test),ui/FollowButton.tsx,index.ts}`
- Modify: `app/composition/container.ts` (+`FRIENDSHIP_GATEWAY`, `SUGGESTIONS_GATEWAY`)

**Interfaces:**
- Produces:
  ```ts
  export interface FriendshipGateway { request(id): Promise<Relation>; accept(id): Promise<Relation>; decline(id): Promise<Relation>; remove(id): Promise<Relation> }
  export const FRIENDSHIP_GATEWAY; export class EdenFriendshipGateway(api, bus)
  export function useFriendAction(userId: number, relation: Relation): { primary: { label: string; mode: 'primary'|'secondary'|'tertiary'; onClick(): void } | null; secondary?: { label: string; onClick(): void }; busy: boolean; error: string | null }
    // none → primary «Добавить в друзья» (request); outgoing → primary «Заявка отправлена» (mode secondary, no-op) + secondary «Отменить заявку» (remove — backend cancels a pending request by its requester, see Task 4)
    // incoming → primary «Принять» (accept) + secondary «Отклонить» (decline); friends → primary «У вас в друзьях» mode secondary + secondary «Удалить из друзей» (remove); self → null
    // optimistic: setQueryData(queryKeys.user.relation(userId), next) before the call; on error rollback + error text via errors.ts (self_friendship, request_cooldown, not_addressee, fallback); on success invalidate relation, friends(me), requests(*), counters(me), counters(userId), user.profile(handle) via predicate on key[0]==='user'
  export function FriendButton({ userId, relation }): JSX   // ButtonGroup with Button(s) from the hook; Snackbar for error via VKUI `Snackbar` rendered when error !== null
  export interface SuggestionsGateway { list(): Promise<SuggestionDto[]>; hide(id): Promise<void> }; useSuggestions(): { items, isPending, isError }; useHideSuggestion(): { hide(id): void }
  export function SuggestionCard({ s: SuggestionDto }): JSX  // RichCell: avatar 48, name link, caption `${mutual} общих друзей` | «Из вашего города»; actions: FriendButton(userId, 'none') + IconButton «Скрыть» (Icon24Cancel)
  export function useJoinCommunity(communityId, membership, isFollowing): { label: 'Вступить'|'Вы участник'; onClick; busy; secondary?: { label: 'Выйти'; onClick } }  // optimistic on queryKeys.community.get(handle) (pass handle too), invalidate mine
  export function useFollowCommunity(communityId, isFollowing): { label: 'Подписаться'|'Вы подписаны'; onClick; busy }
  ```
- Pluralisation helper for «общих друзей»: put `pluralRu(n, ['общий друг','общих друга','общих друзей'])` in `shared/lib/plural.ts` (+test) and export from `@/shared/lib`.

- [ ] **Step 1: Failing tests** (`useFriendAction.test.tsx` via `withDi` + `QueryClientProvider` wrapper helper `withQuery(c)` added to `shared/di/testing.tsx`… `shared/di` must not know TanStack; instead create `shared/lib/testing/withProviders.tsx` exporting `withProviders(container, queryClient?)` composing `DiProvider` + `QueryClientProvider` — import from `@/shared/lib`):
  - none → label «Добавить в друзья»; click → gateway.request called, relation cache `outgoing` immediately (optimistic), stays after resolve.
  - incoming → «Принять»/«Отклонить»; accept → `friends`; decline → `none`.
  - friends → «Удалить из друзей» → `none`.
  - outgoing → «Отменить» → `none`.
  - error `request_cooldown` → cache rolled back to `none`, `error` = «Заявку можно повторить через сутки».
  - `FriendButton.test.tsx`: roles/names per relation; self → renders nothing.
  - `useSuggestions` returns items from fake; `useHideSuggestion` removes the item from the `suggestions` cache optimistically.
  - `useJoinCommunity`: join → membership member, follow true; leave → none; `last_admin` error text «Назначьте другого администратора перед выходом».
- [ ] **Steps 2–5** → commit `feat(web): friendship, suggestions and community-membership features`.

---

### Task 12: Widgets + pages: profile, friends, community, communities; router; app-shell right column and friends counter

**Files:**
- Create: `widgets/profile-card/{ui/ProfileCard.tsx,ui/ProfileCardSkeleton.tsx,ui/profile-card.module.css,model/useProfile.ts,index.ts}` (+tests), `widgets/friends-list` (`useFriendsList(userId)` infinite query, `FriendsList`, skeleton), `widgets/friend-requests` (`useFriendRequests(dir)`, tabs incoming/outgoing with `FriendButton`), `widgets/pymk-block` (`PymkBlock({ compact })` 3 cards + «Показать всех» link, or full list), `widgets/community-header` (`useCommunity(handle)`, header with `Avatar` initials of name, name, topic label, members count, `JoinButton` + `FollowButton`), `widgets/communities-list` (`useMyCommunities`, `CommunitiesList`, skeleton), `widgets/community-members` (`useCommunityMembers(id)`), `pages/{profile,friends,community,communities,handle}`
- Modify: `app/router.tsx`, `widgets/app-shell/ui/{AppShell.tsx,SideNav.tsx}`, `widgets/app-shell/model/{nav.ts,useFriendsBadge.ts}`, `widgets/app-shell/index.ts`, `apps/web/src/shared/lib/topics.ts` (Russian labels for the 12 topics, from contracts `TOPICS`)

**Interfaces:**
- Produces: hooks return `{ data, isPending, isError, fetchNextPage?, hasNextPage? }`; widgets accept ids/handles only; `HandlePage` resolves `/:handle`: `useHandle(handle)` calls `USER_GATEWAY.getProfile` first? No — add `resolve(handle): Promise<HandleDto>` to `UserGateway` (backend `GET /handles/:handle` → add route in Task 8's social routes: `GET /handles/:handle` → `ResolveHandle`). `HandlePage` renders `ProfilePage` or `CommunityPage` by kind, 404 `Placeholder` otherwise.
- Router additions: `/:handle` (authed), `/friends` (authed, `?tab=all|requests|suggestions`), `/communities` (authed), keep `/feed`, remove `/profile`, `/friends`, `/communities` from `comingSoonRoutes` (nav item «Профиль» now links to `/${userHandle(me)}` computed in `SideNav` from `useSession`).
- `SideNav` «Друзья» gets `indicator={<Counter mode="prominent">{n}</Counter>}` when `incomingRequests > 0` (`useFriendsBadge` = `useQuery(queryKeys.user.counters(me.id))`).
- Right column (`AppShell` aside): renders `<PymkBlock compact />` when authed and not bare.

- [ ] **Step 1: Failing tests** — `ProfileCard.test.tsx` (skeleton while pending with `aria-busy`; renders name, status, counters links `/id1/friends`… decide counters link targets: friends → `/friends` for self, `/${handle}/friends` for others (route `/:handle/friends` renders `FriendsList` for that user); `FriendButton` for others; «Редактировать» link `/edit` for self); `FriendsList` infinite scroll button «Показать ещё» appears when `hasNextPage`; `FriendRequests` tabs switch; `PymkBlock` compact renders ≤3 cards and «Показать всех» → `/friends?tab=suggestions`; `CommunityHeader` join button states; `SideNav` counter shown with `aria-label="3 заявки"`; `AppShell` right column contains PYMK when authed; router test not needed (pages tests mount pages in memory router with mocked hooks from widgets via `createSessionTestProvider` + DI fakes — no `vi.mock` of first-party slices except where a slice has no DI seam).
- [ ] **Steps 2–5** → gates incl. Steiger → commit `feat(web): profile, friends and community pages with widgets; nav counter and PYMK column`.

---

### Task 13: Features `search`, `edit-profile`, `create-community` + pages `search`, `edit-profile`; header `SearchBox`; communities page tabs

**Files:**
- Create: `features/search/{model/useSearch.ts (+test),ui/SearchBox.tsx (+test),ui/SearchResults.tsx,index.ts}`, `features/edit-profile/{model/{useEditProfileForm.ts (+test),errors.ts},ui/EditProfileForm.tsx (+test),index.ts}`, `features/create-community/{model/{useCreateCommunityForm.ts (+test),errors.ts},ui/CreateCommunityModal.tsx (+test),index.ts}`, `pages/search`, `pages/edit-profile`
- Modify: `widgets/app-shell/ui/AppHeader.tsx` (replace static `Search` with `SearchBox`), `pages/communities` (tabs «Мои» / «Поиск» + «Создать» button opening the modal), `app/router.tsx` (`/search`, `/edit`)

**Interfaces:**
- Produces:
  ```ts
  useSearch(q: string, kind: 'all'|'users'|'communities'): { users: UserCellDto[]; communities: CommunityCellDto[]; isPending: boolean; enabled: boolean }  // useDeferredValue(q) + useQuery(enabled: q.trim().length >= 2), gateway calls USER_GATEWAY.searchUsers / COMMUNITY_GATEWAY.search in parallel per kind
  SearchBox(): JSX   // VKUI Search value/onChange, Enter → navigate(`/search?q=${encodeURIComponent(q)}`); no results dropdown in this subsystem
  useEditProfileForm(profile: ProfileDto): { values, errors: Partial<Record<Field,string>>, formError: string|null, busy, setField, submit }   // fields status, bio, city, birthday, screenName; client-side length checks mirror backend; success → invalidate user.profile(*) and session setUser with new screenName
  EditProfileForm({ profile }): JSX  // FormLayoutGroup; Input(status maxLength 140), Textarea(bio), Select(city from CITIES, allow empty), DateInput? — VKUI DateInput is heavy; use Input type="date" is a raw tag → forbidden. Use VKUI `DateInput` with `value: Date | undefined`, `onChange`; screenName Input with prefix text «vkc.local/»
  useCreateCommunityForm(onCreated: (c: CommunityDto) => void): { values: { name, screenName, topic, description }, errors, busy, setField, submit }
  CreateCommunityModal({ open, onClose }): JSX  // ModalRoot/ModalPage with ModalPageHeader «Новое сообщество», Select of topics with Russian labels
  ```
- Errors map: `screen_name_taken` → field screenName «Короткое имя занято»; `screen_name_reserved`/`invalid_screen_name` → screenName «3–32 символа: латиница, цифры, _ . ; не начинается с id/club»; `status_too_long` → status «Не длиннее 140 символов»; `invalid_city` → city; `invalid_birthday` → birthday; `invalid_community_name` → name «От 2 до 120 символов».

- [ ] **Step 1: Failing tests** — `useSearch`: no request under 2 chars; debounce/deferred: with fake timers typing «де» then «ден» quickly results in one final query for «ден» (assert gateway called with 'ден' last and not called with 'д'); `SearchBox` Enter navigates (memory router probe); `useEditProfileForm`: submit sends only changed fields, `screen_name_taken` lands on the field, success calls `setUser`; `EditProfileForm` a11y (`aria-invalid`, `aria-describedby`); `useCreateCommunityForm`: success calls `onCreated` and invalidates `communities.mine`.
- [ ] **Steps 2–5** → commit `feat(web): search, profile editing and community creation`.

---

### Task 14: Feature `notifications` — sync hook, bell, list page

**Files:**
- Create: `features/notifications/{model/{useUnreadCount.ts,useNotifications.ts,useMarkRead.ts,useNotificationSync.ts,useDocumentTitle.ts},ui/{NotificationBell.tsx,NotificationsPanel.tsx},index.ts}` (+tests for every hook and the bell), `widgets/notifications-list/{ui/NotificationsList.tsx,ui/NotificationsListSkeleton.tsx,index.ts}`, `pages/notifications`, `app/composition/NotificationSync.tsx`
- Modify: `app/main.tsx` (mount `<NotificationSync />` inside `SessionProvider` — it renders null and calls `useNotificationSync()` only when `status === 'authed'`), `widgets/app-shell/ui/AppHeader.tsx` (add `NotificationBell` before `ThemeToggle` when authed), `app/router.tsx` (`/notifications`)

**Interfaces:**
- Produces:
  ```ts
  useUnreadCount(): { count: number; isPending }                   // useQuery(queryKeys.notifications.unread, enabled: isLeader, refetchInterval: isLeader ? 30_000 : false, refetchOnWindowFocus: true)
  useNotifications(): { items, isPending, fetchNextPage, hasNextPage, isFetchingNextPage }   // useInfiniteQuery by cursor
  useMarkRead(): { markRead(uptoId: number): void }                 // mutation → setQueryData(unread, count) + invalidate list + coordinator.broadcast({ type: 'notifications:read', uptoId })
  useNotificationSync(): void     // subscribes coordinator: on 'notifications:changed' → setQueryData(unread, msg.unread) + invalidate list; on 'notifications:read' → invalidate unread+list; when leader and unread changes → broadcast changed; useDocumentTitle(unread)
  useDocumentTitle(unread: number): void  // `(n) ВКлон` / `ВКлон`
  NotificationBell(): JSX   // IconButton label=`Уведомления${count ? `, непрочитанных: ${count}` : ''}` with Icon28NotificationOutline + Counter (mode prominent) when count>0; click toggles VKUI Popover (trigger="click") containing NotificationsPanel (last 10 + Link «Все уведомления» → /notifications); opening the popover calls markRead(maxId)
  NotificationsList(): JSX   // Group; NotificationsListSkeleton while pending (aria-busy); NotificationItem per row; «Показать ещё» Button when hasNextPage; empty → Placeholder «Уведомлений пока нет»
  ```

- [ ] **Step 1: Failing tests** — `useNotificationSync.test.tsx` with `fakeTabCluster(3)`: three `renderHook`s each with its own container (`TAB_COORDINATOR` → tab i, `NOTIFICATION_GATEWAY` → shared fake with `unreadCount` spy) and its own `QueryClient`: only tab 0 (leader) calls `unreadCount`; when the fake returns 2 the other tabs' `unread` cache becomes 2 without calling the gateway; `close(0)` → tab 1 starts polling (fake timers advance 30 s); `markRead` in tab 2 → tabs 0 and 1 invalidate (their `unreadCount` spy called again); `document.title` becomes `(2) ВКлон` in every tab. `NotificationBell.test.tsx`: counter text «2», label contains «непрочитанных: 2», click opens list and calls `markRead(maxId)`. `NotificationsList` skeleton → items → empty placeholder.
- [ ] **Steps 2–5** → commit `feat(web): notifications with leader-tab polling, bell and list`.

---

### Task 15: Seeder demo data, Playwright `social.spec.ts`, docs, spec §9

**Files:**
- Modify: `apps/seeder/src/seed.ts` (`addDemoUsers`: ensure `demo` has ≥5 incoming `pending` requests, ≥3 outgoing, 30 accepted friendships, 4 memberships; add a unit test in `apps/seeder/src/seed.demo.test.ts` over the pure part — extract `buildDemoGraph(users, rng)` returning the rows so it is testable without DB), `README.md` (subsystem 2 section: routes, demo login `demo`/`demo1234`, tab-leader explanation), `docs/superpowers/specs/2026-09-06-social-graph-design.md` §9 (deviations: `demo` instead of `demo_seed`; `cancel` of a pending request; `TOPICS`/`CITIES` moved to contracts; `GET /handles/:handle`; friendship save via upsert instead of `ConflictError('race')`; anything else implementers recorded), `CLAUDE.md` only if a rule needs precision
- Create: `apps/web/e2e/social.spec.ts`

**Playwright scenario** (two `browser.newContext()`; API and web servers from `playwright.config.ts`; users registered through the UI with unique logins `e2e_a_<ts>` / `e2e_b_<ts>`; Web Locks and BroadcastChannel work in Chromium):
1. B registers, sets status «Привет из e2e» and screen name `b<ts>` on `/edit`; profile opens at `/b<ts>` and shows the status.
2. A registers; searches `b<ts>` via header → `/search?q=`; opens B; clicks «Добавить в друзья» → button reads «Заявка отправлена».
3. B has TWO pages (same context): page 2 stays on `/feed`; in page 1 B opens `/friends?tab=requests` and sees A with «Принять». Page 2's bell counter shows «1» without reload (wait up to 35 s — polling interval — or assert after `page2.reload()` is NOT allowed; use `expect(...).toHaveText('1', { timeout: 40_000 })`).
4. B accepts → A's page shows notification «принял(а) вашу заявку» after reload of `/notifications`; A's profile of B shows «У вас в друзьях».
5. A creates community «Клуб e2e <ts>» (screen name `club_e2e_<ts>`… reserved prefix `club\d` only applies when followed by a digit; `club_e2e` is fine); B opens `/club_e2e_<ts>`, clicks «Вступить», header shows «2 участника».
6. A on `/friends?tab=suggestions` sees no crash (list may be empty) — assert page heading.

- [ ] **Step 1**: write `social.spec.ts` (failing until everything is wired — it is the acceptance test). **Step 2**: `cd apps/web && bunx playwright test` → all 4 specs pass (3 auth + 1 social; social may take ~1 min). **Step 3**: seeder unit test + `bun run seed --scale 0.05 --yes` smoke against dev DB to confirm demo graph. **Step 4**: docs. **Step 5**: full gates `bun run lint && bun run typecheck && bun run test && cd apps/web && bunx playwright test`. **Step 6**: commit `test(e2e): social graph scenario; docs for subsystem 2`.

---

## Self-review notes (done while writing)

- Spec coverage: §3 → Task 2; §4.1 social-graph → Tasks 3–5; identity → 6; notifications → 7; search → 5/6/8; §4.2 → 8; §5.1 → 10–14; §5.2 → 11–14; §5.3 → 9, 14; §5.4 skeletons → 10, 12, 14; §5.5 errors → 11, 13; §6 seeder → 15; §7 tests → each task; Playwright → 15.
- Deviations from spec already known and to be recorded in §9 by Task 15: `demo` user reused; pending request cancel (`Friendship.cancel`) added because the UI needs «Отменить заявку»; `TOPICS` and `CITIES` live in `@vkc/contracts`; `GET /handles/:handle`; friendship persistence by upsert; `SOCIAL.Clock` token for deterministic cooldown.
- Type consistency: `Relation`, `Counters` defined once in `kernel/social-read.ts` and re-exported through `modules/dto.ts` → contracts → web entities; `Page<T>` defined in social-graph `dto.ts` and re-exported the same way; `UserCellDto` shape identical across api and web.

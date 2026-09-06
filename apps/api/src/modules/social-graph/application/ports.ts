import { token } from '../../../kernel/di'
import type { SocialReadPort } from '../../../kernel/social-read'
import type { Community } from '../domain/community'
import type { Friendship } from '../domain/friendship'
import type {
  CommunityCellDto,
  CommunityDto,
  HandleDto,
  Page,
  SuggestionDto,
  UserCellDto,
} from './dto'

/**
 * `'inserted'` — a fresh row was created (no existing pair). `'updated'` — an existing row was
 * overwritten with the incoming aggregate's values (accept/decline/remove/rerequest, or a
 * duplicate insert from the same requester). `'deleted'` — `f.isRemoved`. `'raced_accepted'` — a
 * genuine mutual-request race: two opposite-direction `Friendship.request(...)` calls both saw no
 * existing row, and this save lost the insert race, so instead of overwriting the winner's
 * pending row with its own it was reconciled to `accepted`. Only the loser of that race observes
 * `'raced_accepted'`; the caller uses it to publish the `FriendshipAccepted` event that would
 * otherwise never fire for this path.
 */
export type SaveOutcome = 'inserted' | 'updated' | 'deleted' | 'raced_accepted'

export interface FriendshipRepository {
  find(a: number, b: number): Promise<Friendship | null>
  /** Upserts the row keyed by the ordered pair; deletes it when `f.isRemoved`. */
  save(f: Friendship): Promise<SaveOutcome>
}
export interface FollowRepository {
  add(followerId: number, target: { type: 'user' | 'community'; id: number }): Promise<void>
  remove(followerId: number, target: { type: 'user' | 'community'; id: number }): Promise<void>
}
export interface CommunityRepository {
  findById(id: number): Promise<Community | null>
  findByScreenName(s: string): Promise<Community | null>
  /** Blind write — for creating a community (and for tests seeding a known state). A membership
   * change that has to respect an invariant goes through `withLock`. */
  save(c: Community): Promise<Community>
  /**
   * Loads the community under a lock, hands it to `fn`, then persists whatever `fn` changed —
   * all inside one transaction, so concurrent membership changes on the same community serialise
   * and each one reasons about the previous one's committed state. Rejects with
   * `CommunityNotFound` when no such community exists, and rolls the whole thing back when `fn`
   * throws (e.g. `LastAdminCannotLeave`).
   */
  withLock<T>(id: number, fn: (c: Community) => Promise<T>): Promise<T>
}
export interface SocialReadModel extends SocialReadPort {
  friends(userId: number, cursor?: string): Promise<Page<UserCellDto>>
  requests(me: number, dir: 'incoming' | 'outgoing', cursor?: string): Promise<Page<UserCellDto>>
  followers(userId: number, cursor?: string): Promise<Page<UserCellDto>>
  community(idOrScreen: string, me: number | null): Promise<CommunityDto | null>
  members(communityId: number, cursor?: string): Promise<Page<UserCellDto>>
  myCommunities(me: number): Promise<CommunityCellDto[]>
  suggestions(me: number): Promise<SuggestionDto[]>
  searchCommunities(q: string, limit: number): Promise<CommunityCellDto[]>
  resolveHandle(handle: string): Promise<HandleDto | null>
}
export interface SuggestionCache {
  get(userId: number): Promise<SuggestionDto[] | null>
  set(userId: number, items: SuggestionDto[], ttlSeconds: number): Promise<void>
  invalidate(userIds: number[]): Promise<void>
}
export interface SuggestionHider {
  hide(userId: number, hiddenId: number): Promise<void>
}
/**
 * Minimal cross-context check: does this user id exist at all? Social-graph must not reach into
 * identity's aggregate or read model, but it does need to refuse a request/hide aimed at a
 * nonexistent user *before* writing anything — otherwise `friendships`/`follows` rows are only
 * stopped by a foreign key, which surfaces as a 500 rather than a 404.
 */
export interface UserExistence {
  exists(userId: number): Promise<boolean>
}
export interface Clock {
  now(): Date
}

export const SOCIAL = {
  FriendshipRepository: token<FriendshipRepository>('FriendshipRepository'),
  FollowRepository: token<FollowRepository>('FollowRepository'),
  CommunityRepository: token<CommunityRepository>('CommunityRepository'),
  ReadModel: token<SocialReadModel>('SocialReadModel'),
  SuggestionCache: token<SuggestionCache>('SuggestionCache'),
  SuggestionHider: token<SuggestionHider>('SuggestionHider'),
  UserExists: token<UserExistence>('UserExists'),
  Clock: token<Clock>('Clock'),
}

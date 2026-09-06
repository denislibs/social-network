import type { Topic } from '@vkc/contracts'
import type { Counters, Relation } from '../../../../kernel/social-read'
import { Community, type MemberRole } from '../../domain/community'
import { CommunityNotFound } from '../../domain/errors'
import { Friendship } from '../../domain/friendship'
import { orderPair } from '../../domain/value-objects'
import type {
  CommunityCellDto,
  CommunityDto,
  HandleDto,
  Page,
  SuggestionDto,
  UserCellDto,
} from '../dto'
import type {
  CommunityRepository,
  FollowRepository,
  FriendshipRepository,
  SaveOutcome,
  SocialReadModel,
  SuggestionCache,
  SuggestionHider,
  UserExistence,
} from '../ports'

const emptyPage = <T>(): Page<T> => ({ items: [], nextCursor: null })

/** Map keyed `lo:hi` — mirrors the ordered-pair key the domain uses for a friendship row. */
export class InMemoryFriendships implements FriendshipRepository {
  rows = new Map<string, Friendship>()
  /**
   * Test-only hook: when true, the *next* `find()` call returns `null` regardless of stored
   * state (and resets the flag) — simulates a concurrent transaction that hasn't yet observed a
   * row the other side just inserted, so a test can drive the mutual-request-race code path
   * deterministically instead of relying on real concurrency.
   */
  raceOnce = false
  private key(a: number, b: number): string {
    const { lo, hi } = orderPair(a, b)
    return `${lo}:${hi}`
  }
  async find(a: number, b: number): Promise<Friendship | null> {
    if (this.raceOnce) {
      this.raceOnce = false
      return null
    }
    return this.rows.get(this.key(a, b)) ?? null
  }
  async save(f: Friendship): Promise<SaveOutcome> {
    const key = `${f.props.lo}:${f.props.hi}`
    if (f.isRemoved) {
      this.rows.delete(key)
      return 'deleted'
    }
    const existing = this.rows.get(key)
    if (
      existing &&
      existing.props.status === 'pending' &&
      f.props.status === 'pending' &&
      existing.props.requesterId !== f.props.requesterId
    ) {
      this.rows.set(
        key,
        Friendship.rehydrate({ ...existing.props, status: 'accepted', acceptedAt: new Date() }),
      )
      return 'raced_accepted'
    }
    const wasPresent = this.rows.has(key)
    this.rows.set(key, f)
    return wasPresent ? 'updated' : 'inserted'
  }
}

export class InMemoryFollows implements FollowRepository {
  private rows = new Set<string>()
  private key(followerId: number, target: { type: 'user' | 'community'; id: number }): string {
    return `${followerId}|${target.type}|${target.id}`
  }
  async add(followerId: number, target: { type: 'user' | 'community'; id: number }): Promise<void> {
    this.rows.add(this.key(followerId, target))
  }
  async remove(
    followerId: number,
    target: { type: 'user' | 'community'; id: number },
  ): Promise<void> {
    this.rows.delete(this.key(followerId, target))
  }
  has(followerId: number, target: { type: 'user' | 'community'; id: number }): boolean {
    return this.rows.has(this.key(followerId, target))
  }
}

type CommunitySnapshot = {
  id: number
  screenName: string
  name: string
  description: string | null
  topic: Topic
  createdAt: Date
  members: Map<number, MemberRole>
}

export class InMemoryCommunities implements CommunityRepository {
  private rows = new Map<number, CommunitySnapshot>()
  private byScreenName = new Map<string, number>()
  private seq = 0
  /**
   * One promise chain per community id, so `withLock` calls for the same community run strictly
   * one after another — the in-memory stand-in for `SELECT … FOR UPDATE`. Without it a test of
   * two concurrent handlers would prove nothing.
   */
  private locks = new Map<number, Promise<unknown>>()

  /** Rehydrates a *fresh* aggregate on every load, exactly like the Drizzle repository. Handing
   * out one shared mutable instance would make concurrent handlers accidentally see each other's
   * uncommitted changes and hide the very race these fakes exist to model. */
  private load(id: number): Community | null {
    const s = this.rows.get(id)
    return s ? Community.rehydrate({ ...s, members: new Map(s.members) }) : null
  }
  private store(c: Community): void {
    const p = c.props
    const id = p.id as number
    this.rows.set(id, { ...p, id, members: new Map(c.memberEntries()) })
    this.byScreenName.set(p.screenName, id)
  }

  async findById(id: number): Promise<Community | null> {
    return this.load(id)
  }
  async findByScreenName(s: string): Promise<Community | null> {
    const id = this.byScreenName.get(s)
    return id === undefined ? null : this.load(id)
  }
  async save(c: Community): Promise<Community> {
    if (c.props.id === null) c.assignId(++this.seq)
    this.store(c)
    return c
  }
  async withLock<T>(id: number, fn: (c: Community) => Promise<T>): Promise<T> {
    const run = (this.locks.get(id) ?? Promise.resolve()).then(async () => {
      const community = this.load(id)
      if (!community) throw new CommunityNotFound()
      const result = await fn(community)
      this.store(community)
      return result
    })
    // The chain must survive a rejection (a rolled-back `last_admin` leave), or every later
    // waiter on this community would inherit that failure instead of running.
    this.locks.set(
      id,
      run.then(
        () => undefined,
        () => undefined,
      ),
    )
    return run
  }
}

/**
 * Computes `relation`/`counters` from the same in-memory friendship map the friendship commands
 * write to, so a `GetRelation`/`GetCounters` query run right after a command in a test observes
 * the real effect. Every other list-shaped method returns an empty page — those reads aren't
 * exercised by the application-layer tests here (only `suggestionsFor` is, via the test's direct
 * seeding hook).
 */
export class InMemorySocialRead implements SocialReadModel {
  suggestionsFor = new Map<number, SuggestionDto[]>()
  constructor(private friendships: InMemoryFriendships) {}

  async relation(me: number | null, other: number): Promise<Relation> {
    if (me === null) return 'none'
    if (me === other) return 'self'
    const f = await this.friendships.find(me, other)
    if (!f) return 'none'
    const p = f.props
    if (p.status === 'accepted') return 'friends'
    if (p.status === 'pending') return p.requesterId === me ? 'outgoing' : 'incoming'
    return 'none'
  }
  async counters(userId: number): Promise<Counters> {
    let friends = 0
    let incomingRequests = 0
    for (const f of this.friendships.rows.values()) {
      const p = f.props
      if (p.lo !== userId && p.hi !== userId) continue
      if (p.status === 'accepted') friends++
      else if (p.status === 'pending' && p.requesterId !== userId) incomingRequests++
    }
    return { friends, followers: 0, communities: 0, incomingRequests }
  }
  async friends(_userId: number, _cursor?: string): Promise<Page<UserCellDto>> {
    return emptyPage()
  }
  async requests(
    _me: number,
    _dir: 'incoming' | 'outgoing',
    _cursor?: string,
  ): Promise<Page<UserCellDto>> {
    return emptyPage()
  }
  async followers(_userId: number, _cursor?: string): Promise<Page<UserCellDto>> {
    return emptyPage()
  }
  async community(_idOrScreen: string, _me: number | null): Promise<CommunityDto | null> {
    return null
  }
  async members(_communityId: number, _cursor?: string): Promise<Page<UserCellDto>> {
    return emptyPage()
  }
  async myCommunities(_me: number): Promise<CommunityCellDto[]> {
    return []
  }
  async suggestions(me: number): Promise<SuggestionDto[]> {
    return this.suggestionsFor.get(me) ?? []
  }
  async searchCommunities(_q: string, _limit: number): Promise<CommunityCellDto[]> {
    return []
  }
  async resolveHandle(_handle: string): Promise<HandleDto | null> {
    return null
  }
}

export class InMemorySuggestionCache implements SuggestionCache {
  private rows = new Map<number, SuggestionDto[]>()
  async get(userId: number): Promise<SuggestionDto[] | null> {
    return this.rows.get(userId) ?? null
  }
  async set(userId: number, items: SuggestionDto[], _ttlSeconds: number): Promise<void> {
    this.rows.set(userId, items)
  }
  async invalidate(userIds: number[]): Promise<void> {
    for (const id of userIds) this.rows.delete(id)
  }
}

/**
 * Permissive by default: the application tests are about graph rules, not about maintaining a
 * user table, so every id exists unless a test explicitly adds it to `missing` to exercise the
 * not-found path.
 */
export class InMemoryUserExistence implements UserExistence {
  missing = new Set<number>()
  async exists(userId: number): Promise<boolean> {
    return !this.missing.has(userId)
  }
}

export class InMemorySuggestionHider implements SuggestionHider {
  rows = new Set<string>()
  async hide(userId: number, hiddenId: number): Promise<void> {
    this.rows.add(`${userId}|${hiddenId}`)
  }
}

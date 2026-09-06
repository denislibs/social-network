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

export interface FriendshipRepository {
  find(a: number, b: number): Promise<Friendship | null>
  /** Upserts the row keyed by the ordered pair; deletes it when `f.isRemoved`. */
  save(f: Friendship): Promise<void>
}
export interface FollowRepository {
  add(followerId: number, target: { type: 'user' | 'community'; id: number }): Promise<void>
  remove(followerId: number, target: { type: 'user' | 'community'; id: number }): Promise<void>
}
export interface CommunityRepository {
  findById(id: number): Promise<Community | null>
  findByScreenName(s: string): Promise<Community | null>
  save(c: Community): Promise<Community>
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
  Clock: token<Clock>('Clock'),
}

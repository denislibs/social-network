import type { Topic } from '@vkc/contracts'

export type UserCellDto = {
  id: number
  firstName: string
  lastName: string
  screenName: string | null
  city: string | null
  isVerified: boolean
  lastSeenAt: string | null
}
export type Page<T> = { items: T[]; nextCursor: string | null }
export type Membership = 'none' | 'member' | 'editor' | 'admin'
export type CommunityDto = {
  id: number
  screenName: string
  name: string
  description: string | null
  topic: Topic
  isVerified: boolean
  membersCount: number
  membership: Membership
  isFollowing: boolean
}
export type CommunityCellDto = Pick<
  CommunityDto,
  'id' | 'screenName' | 'name' | 'topic' | 'isVerified' | 'membersCount'
>
export type SuggestionDto = UserCellDto & { mutual: number; sameCity: boolean }
export type HandleDto = { kind: 'user' | 'community'; id: number }

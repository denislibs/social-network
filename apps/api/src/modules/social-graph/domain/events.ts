import type { DomainEvent } from '../../../kernel/event-bus'

export type FriendRequested = DomainEvent<
  'FriendRequested',
  { requesterId: number; addresseeId: number }
>
export type FriendshipAccepted = DomainEvent<
  'FriendshipAccepted',
  { userLo: number; userHi: number; acceptedBy: number }
>
export type FriendRequestDeclined = DomainEvent<
  'FriendRequestDeclined',
  { requesterId: number; addresseeId: number }
>
export type FriendshipRemoved = DomainEvent<
  'FriendshipRemoved',
  { removedBy: number; other: number }
>
export type CommunityCreated = DomainEvent<
  'CommunityCreated',
  { communityId: number; ownerId: number }
>
export type CommunityJoined = DomainEvent<
  'CommunityJoined',
  { communityId: number; userId: number }
>
export type CommunityLeft = DomainEvent<'CommunityLeft', { communityId: number; userId: number }>

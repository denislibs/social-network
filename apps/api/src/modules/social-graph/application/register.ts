import type { Container } from '../../../kernel/di'
import { KERNEL } from '../../../kernel/tokens'
import { AcceptFriendRequest, acceptFriendRequestHandler } from './commands/accept-friend-request'
import { CreateCommunity, createCommunityHandler } from './commands/create-community'
import {
  DeclineFriendRequest,
  declineFriendRequestHandler,
} from './commands/decline-friend-request'
import { FollowCommunity, followCommunityHandler } from './commands/follow-community'
import { HideSuggestion, hideSuggestionHandler } from './commands/hide-suggestion'
import { JoinCommunity, joinCommunityHandler } from './commands/join-community'
import { LeaveCommunity, leaveCommunityHandler } from './commands/leave-community'
import { RemoveFriend, removeFriendHandler } from './commands/remove-friend'
import { SendFriendRequest, sendFriendRequestHandler } from './commands/send-friend-request'
import { UnfollowCommunity, unfollowCommunityHandler } from './commands/unfollow-community'
import { SOCIAL } from './ports'
import { GetCommunity, getCommunityHandler } from './queries/get-community'
import { GetCommunityMembers, getCommunityMembersHandler } from './queries/get-community-members'
import { GetCounters, getCountersHandler } from './queries/get-counters'
import { GetFollowers, getFollowersHandler } from './queries/get-followers'
import { GetFriendRequests, getFriendRequestsHandler } from './queries/get-friend-requests'
import { GetFriends, getFriendsHandler } from './queries/get-friends'
import { GetMyCommunities, getMyCommunitiesHandler } from './queries/get-my-communities'
import { GetRelation, getRelationHandler } from './queries/get-relation'
import { GetSuggestedFriends, getSuggestedFriendsHandler } from './queries/get-suggested-friends'
import { ResolveHandle, resolveHandleHandler } from './queries/resolve-handle'
import { SearchCommunities, searchCommunitiesHandler } from './queries/search-communities'

export async function registerSocialGraphHandlers(c: Container): Promise<void> {
  const d = {
    friendships: c.get(SOCIAL.FriendshipRepository),
    follows: c.get(SOCIAL.FollowRepository),
    communities: c.get(SOCIAL.CommunityRepository),
    read: c.get(SOCIAL.ReadModel),
    cache: c.get(SOCIAL.SuggestionCache),
    hider: c.get(SOCIAL.SuggestionHider),
    users: c.get(SOCIAL.UserExists),
    clock: c.get(SOCIAL.Clock),
    events: c.get(KERNEL.EventBus),
  }
  const commands = c.get(KERNEL.CommandBus)
  const queries = c.get(KERNEL.QueryBus)

  commands.register(SendFriendRequest, sendFriendRequestHandler(d))
  commands.register(AcceptFriendRequest, acceptFriendRequestHandler(d))
  commands.register(DeclineFriendRequest, declineFriendRequestHandler(d))
  commands.register(RemoveFriend, removeFriendHandler(d))
  commands.register(FollowCommunity, followCommunityHandler(d))
  commands.register(UnfollowCommunity, unfollowCommunityHandler(d))
  commands.register(CreateCommunity, createCommunityHandler(d))
  commands.register(JoinCommunity, joinCommunityHandler(d))
  commands.register(LeaveCommunity, leaveCommunityHandler(d))
  commands.register(HideSuggestion, hideSuggestionHandler(d))

  queries.register(GetRelation, getRelationHandler(d))
  queries.register(GetFriends, getFriendsHandler(d))
  queries.register(GetFriendRequests, getFriendRequestsHandler(d))
  queries.register(GetFollowers, getFollowersHandler(d))
  queries.register(GetCommunity, getCommunityHandler(d))
  queries.register(GetCommunityMembers, getCommunityMembersHandler(d))
  queries.register(GetMyCommunities, getMyCommunitiesHandler(d))
  queries.register(GetSuggestedFriends, getSuggestedFriendsHandler(d))
  queries.register(GetCounters, getCountersHandler(d))
  queries.register(SearchCommunities, searchCommunitiesHandler(d))
  queries.register(ResolveHandle, resolveHandleHandler(d))
}

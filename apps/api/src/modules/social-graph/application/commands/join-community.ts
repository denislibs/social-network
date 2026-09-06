import type { Command } from '../../../../kernel/command-bus'
import type { EventBus } from '../../../../kernel/event-bus'
import { CommunityNotFound } from '../../domain/errors'
import type { Membership } from '../dto'
import type { CommunityRepository, FollowRepository } from '../ports'

export class JoinCommunity implements Command<{ membership: Membership; isFollowing: boolean }> {
  declare readonly __result: { membership: Membership; isFollowing: boolean }
  constructor(readonly input: { me: number; communityId: number }) {}
}

export function joinCommunityHandler(d: {
  communities: CommunityRepository
  follows: FollowRepository
  events: EventBus
}) {
  return async (cmd: JoinCommunity) => {
    const community = await d.communities.findById(cmd.input.communityId)
    if (!community) throw new CommunityNotFound()
    community.join(cmd.input.me)
    await d.communities.save(community)
    await d.follows.add(cmd.input.me, { type: 'community', id: cmd.input.communityId })
    await d.events.publish(community.pullEvents())
    return { membership: 'member' as Membership, isFollowing: true }
  }
}

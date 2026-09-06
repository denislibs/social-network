import type { Command } from '../../../../kernel/command-bus'
import type { EventBus } from '../../../../kernel/event-bus'
import { CommunityNotFound } from '../../domain/errors'
import type { Membership } from '../dto'
import type { CommunityRepository, FollowRepository } from '../ports'

export class LeaveCommunity implements Command<{ membership: Membership; isFollowing: boolean }> {
  declare readonly __result: { membership: Membership; isFollowing: boolean }
  constructor(readonly input: { me: number; communityId: number }) {}
}

export function leaveCommunityHandler(d: {
  communities: CommunityRepository
  follows: FollowRepository
  events: EventBus
}) {
  return async (cmd: LeaveCommunity) => {
    const community = await d.communities.findById(cmd.input.communityId)
    if (!community) throw new CommunityNotFound()
    community.leave(cmd.input.me)
    await d.communities.save(community)
    await d.follows.remove(cmd.input.me, { type: 'community', id: cmd.input.communityId })
    await d.events.publish(community.pullEvents())
    return { membership: 'none' as Membership, isFollowing: false }
  }
}

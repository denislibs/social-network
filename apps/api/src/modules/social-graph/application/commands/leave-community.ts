import type { Command } from '../../../../kernel/command-bus'
import type { DomainEvent, EventBus } from '../../../../kernel/event-bus'
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
    const { me, communityId } = cmd.input
    let events: DomainEvent[] = []
    // Under the row lock, two admins leaving at the same time are serialised: the second one
    // sees the first one's committed departure and `Community.leave` raises `last_admin`.
    // A throw inside `withLock` rolls the whole transaction back, so nothing is half-written.
    await d.communities.withLock(communityId, async (community) => {
      community.leave(me)
      events = community.pullEvents()
    })
    await d.follows.remove(me, { type: 'community', id: communityId })
    await d.events.publish(events)
    return { membership: 'none' as Membership, isFollowing: false }
  }
}

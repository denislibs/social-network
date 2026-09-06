import type { Command } from '../../../../kernel/command-bus'
import type { DomainEvent, EventBus } from '../../../../kernel/event-bus'
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
    const { me, communityId } = cmd.input
    let events: DomainEvent[] = []
    // `withLock` rejects with CommunityNotFound for an unknown id and serialises this join
    // against any other concurrent membership change on the same community.
    const membership = await d.communities.withLock(communityId, async (community) => {
      community.join(me)
      events = community.pullEvents()
      // Joining is idempotent, so someone who is already an admin/editor keeps that role — report
      // the role the aggregate actually holds rather than assuming 'member'.
      return (community.roleOf(me) ?? 'member') as Membership
    })
    await d.follows.add(me, { type: 'community', id: communityId })
    await d.events.publish(events)
    return { membership, isFollowing: true }
  }
}

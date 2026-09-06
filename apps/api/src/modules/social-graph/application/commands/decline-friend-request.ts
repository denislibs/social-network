import type { Command } from '../../../../kernel/command-bus'
import type { EventBus } from '../../../../kernel/event-bus'
import type { Relation } from '../../../../kernel/social-read'
import { FriendshipNotFound } from '../../domain/errors'
import type { Clock, FriendshipRepository, SuggestionCache } from '../ports'

export class DeclineFriendRequest implements Command<Relation> {
  declare readonly __result: Relation
  constructor(readonly input: { me: number; other: number }) {}
}

export function declineFriendRequestHandler(d: {
  friendships: FriendshipRepository
  cache: SuggestionCache
  clock: Clock
  events: EventBus
}) {
  return async (cmd: DeclineFriendRequest): Promise<Relation> => {
    const { me, other } = cmd.input
    const f = await d.friendships.find(me, other)
    if (!f) throw new FriendshipNotFound()
    // Declining keeps the addressee's follow row on the requester (VK semantics): the requester
    // was following in hope of being accepted, and a decline doesn't revoke that follow.
    // The clock (not `new Date()`) stamps `declinedAt`, which anchors the re-request cooldown —
    // that rule has to be testable without waiting 24 real hours.
    f.decline(me, d.clock.now())
    await d.friendships.save(f)
    await d.events.publish(f.pullEvents())
    await d.cache.invalidate([me, other])
    return 'none'
  }
}

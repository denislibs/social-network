import type { Command } from '../../../../kernel/command-bus'
import type { EventBus } from '../../../../kernel/event-bus'
import type { Relation } from '../../../../kernel/social-read'
import { FriendshipNotFound } from '../../domain/errors'
import type { FollowRepository, FriendshipRepository, SuggestionCache } from '../ports'

export class AcceptFriendRequest implements Command<Relation> {
  declare readonly __result: Relation
  constructor(readonly input: { me: number; other: number }) {}
}

export function acceptFriendRequestHandler(d: {
  friendships: FriendshipRepository
  follows: FollowRepository
  cache: SuggestionCache
  events: EventBus
}) {
  return async (cmd: AcceptFriendRequest): Promise<Relation> => {
    const { me, other } = cmd.input
    const f = await d.friendships.find(me, other)
    if (!f) throw new FriendshipNotFound()
    const requesterId = f.props.requesterId
    f.accept(me)
    await d.friendships.save(f)
    // Friends are not followers: the `follows(requester → addressee)` row the request created
    // only ever meant "let me keep up with you while I wait". Now that the edge is mutual the
    // friendship carries it, and leaving the row behind would double-count in `followers`.
    await d.follows.remove(requesterId, { type: 'user', id: me })
    await d.events.publish(f.pullEvents())
    await d.cache.invalidate([me, other])
    return 'friends'
  }
}

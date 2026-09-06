import type { Command } from '../../../../kernel/command-bus'
import type { EventBus } from '../../../../kernel/event-bus'
import type { Relation } from '../../../../kernel/social-read'
import { FriendshipNotFound } from '../../domain/errors'
import type { FriendshipRepository, SuggestionCache } from '../ports'

export class AcceptFriendRequest implements Command<Relation> {
  declare readonly __result: Relation
  constructor(readonly input: { me: number; other: number }) {}
}

export function acceptFriendRequestHandler(d: {
  friendships: FriendshipRepository
  cache: SuggestionCache
  events: EventBus
}) {
  return async (cmd: AcceptFriendRequest): Promise<Relation> => {
    const { me, other } = cmd.input
    const f = await d.friendships.find(me, other)
    if (!f) throw new FriendshipNotFound()
    f.accept(me)
    await d.friendships.save(f)
    await d.events.publish(f.pullEvents())
    await d.cache.invalidate([me, other])
    return 'friends'
  }
}

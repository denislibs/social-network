import type { Command } from '../../../../kernel/command-bus'
import type { EventBus } from '../../../../kernel/event-bus'
import type { Relation } from '../../../../kernel/social-read'
import { FriendshipNotFound } from '../../domain/errors'
import type { FollowRepository, FriendshipRepository, SuggestionCache } from '../ports'

export class RemoveFriend implements Command<Relation> {
  declare readonly __result: Relation
  constructor(readonly input: { me: number; other: number }) {}
}

export function removeFriendHandler(d: {
  friendships: FriendshipRepository
  follows: FollowRepository
  cache: SuggestionCache
  events: EventBus
}) {
  return async (cmd: RemoveFriend): Promise<Relation> => {
    const { me, other } = cmd.input
    const f = await d.friendships.find(me, other)
    if (!f) throw new FriendshipNotFound()
    const p = f.props
    if (p.status === 'pending' && p.requesterId === me) {
      // Withdrawing our own pending request: no relationship ever formed, so drop the follow too.
      f.cancel(me)
      await d.follows.remove(me, { type: 'user', id: other })
    } else {
      // Removing an accepted friendship: the removed side keeps following the remover.
      f.remove(me)
      await d.follows.add(other, { type: 'user', id: me })
    }
    await d.friendships.save(f)
    await d.events.publish(f.pullEvents())
    await d.cache.invalidate([me, other])
    return 'none'
  }
}

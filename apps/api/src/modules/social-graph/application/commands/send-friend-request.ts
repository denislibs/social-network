import type { Command } from '../../../../kernel/command-bus'
import type { EventBus } from '../../../../kernel/event-bus'
import type { Relation } from '../../../../kernel/social-read'
import { Friendship } from '../../domain/friendship'
import type { Clock, FollowRepository, FriendshipRepository, SuggestionCache } from '../ports'

export class SendFriendRequest implements Command<Relation> {
  declare readonly __result: Relation
  constructor(readonly input: { me: number; other: number }) {}
}

export function sendFriendRequestHandler(d: {
  friendships: FriendshipRepository
  follows: FollowRepository
  cache: SuggestionCache
  clock: Clock
  events: EventBus
}) {
  return async (cmd: SendFriendRequest): Promise<Relation> => {
    const { me, other } = cmd.input
    const existing = await d.friendships.find(me, other)
    let f: Friendship
    let relation: Relation
    let isFreshRequest = false

    if (!existing) {
      f = Friendship.request(me, other, d.clock.now())
      await d.follows.add(me, { type: 'user', id: other })
      relation = 'outgoing'
      isFreshRequest = true
    } else {
      const p = existing.props
      if (p.status === 'pending' && p.requesterId === other) {
        // The other side already asked us — accepting their request is the natural response.
        existing.counterRequest(me, d.clock.now())
        f = existing
        relation = 'friends'
      } else if (p.status === 'pending' && p.requesterId === me) {
        return 'outgoing' // idempotent: our own request is already pending
      } else if (p.status === 'accepted') {
        return 'friends' // idempotent: already friends
      } else {
        // declined
        existing.rerequest(me, d.clock.now())
        await d.follows.add(me, { type: 'user', id: other })
        f = existing
        relation = 'outgoing'
      }
    }

    const outcome = await d.friendships.save(f)
    await d.events.publish(f.pullEvents())

    if (isFreshRequest && outcome === 'raced_accepted') {
      // Both sides raced `Friendship.request(...)` from opposite directions and each saw no
      // existing row; the repository resolved the row to `accepted`, but the aggregate we built
      // above only ever pulled a `FriendRequested` event — nobody's aggregate ever transitioned
      // through `accept()`, so no `FriendshipAccepted` would otherwise fire. Only the request
      // that lost the insert race observes `raced_accepted`, so exactly one side publishes this.
      await d.events.publish([
        {
          type: 'FriendshipAccepted',
          occurredAt: d.clock.now(),
          payload: { userLo: f.props.lo, userHi: f.props.hi, acceptedBy: me },
        },
      ])
      relation = 'friends'
    }

    await d.cache.invalidate([me, other])
    return relation
  }
}

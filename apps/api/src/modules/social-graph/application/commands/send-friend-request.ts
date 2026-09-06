import type { Command } from '../../../../kernel/command-bus'
import { NotFoundError } from '../../../../kernel/errors'
import type { EventBus } from '../../../../kernel/event-bus'
import type { Relation } from '../../../../kernel/social-read'
import { Friendship } from '../../domain/friendship'
import type {
  Clock,
  FollowRepository,
  FriendshipRepository,
  SuggestionCache,
  UserExistence,
} from '../ports'

export class SendFriendRequest implements Command<Relation> {
  declare readonly __result: Relation
  constructor(readonly input: { me: number; other: number }) {}
}

export function sendFriendRequestHandler(d: {
  friendships: FriendshipRepository
  follows: FollowRepository
  users: UserExistence
  cache: SuggestionCache
  clock: Clock
  events: EventBus
}) {
  return async (cmd: SendFriendRequest): Promise<Relation> => {
    const { me, other } = cmd.input
    // Before any write: a request aimed at a nonexistent user is a 404, not a foreign-key 500.
    if (!(await d.users.exists(other))) throw new NotFoundError('user_not_found', 'User not found')

    const existing = await d.friendships.find(me, other)
    let f: Friendship
    let relation: Relation
    let isFreshRequest = false

    if (!existing) {
      f = Friendship.request(me, other, d.clock.now())
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
        f = existing
        relation = 'outgoing'
      }
    }

    // `friendships` is the source of truth and is written first: a follow row written ahead of a
    // failing friendship save would leave a follow with no request behind it.
    const outcome = await d.friendships.save(f)
    const raced = isFreshRequest && outcome === 'raced_accepted'
    if (raced) relation = 'friends'

    if (relation === 'friends') {
      // Friends are not followers. Whichever direction's request created a follow row — ours on a
      // re-request, theirs on the request we just accepted, or both in the mutual race below —
      // the friendship edge now carries that relationship, so both rows go.
      await d.follows.remove(me, { type: 'user', id: other })
      await d.follows.remove(other, { type: 'user', id: me })
    } else {
      await d.follows.add(me, { type: 'user', id: other })
    }

    await d.events.publish(f.pullEvents())

    if (raced) {
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
    }

    await d.cache.invalidate([me, other])
    return relation
  }
}

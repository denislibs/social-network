import type { DomainEvent, EventBus } from '../../../../kernel/event-bus'
import type { NotificationRepository } from '../ports'

/**
 * Notifications must not import social-graph (module boundaries forbid reaching into another
 * module's inner layers), so the event payload shapes it needs are declared locally here —
 * structurally identical to social-graph's `domain/events.ts` — instead of imported.
 */
type FriendRequestedPayload = { requesterId: number; addresseeId: number }
type FriendshipAcceptedPayload = { userLo: number; userHi: number; acceptedBy: number }

/**
 * Projects social-graph friendship events into notification rows.
 * `FriendRequestDeclined` and `FriendshipRemoved` (and any community event) intentionally
 * produce no notification.
 */
export function subscribeGraphNotifications(events: EventBus, repo: NotificationRepository): void {
  events.subscribe<DomainEvent<'FriendRequested', FriendRequestedPayload>>(
    'FriendRequested',
    async (e) => {
      await repo.insert([
        { userId: e.payload.addresseeId, kind: 'friend_request', actorId: e.payload.requesterId },
      ])
    },
  )
  events.subscribe<DomainEvent<'FriendshipAccepted', FriendshipAcceptedPayload>>(
    'FriendshipAccepted',
    async (e) => {
      const { userLo, userHi, acceptedBy } = e.payload
      const recipient = acceptedBy === userLo ? userHi : userLo
      await repo.insert([{ userId: recipient, kind: 'friend_accepted', actorId: acceptedBy }])
    },
  )
}

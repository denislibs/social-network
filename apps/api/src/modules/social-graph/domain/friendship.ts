import type { DomainEvent } from '../../../kernel/event-bus'
import {
  FriendshipNotFound,
  NotRequestAddressee,
  RequestCooldown,
  SelfFriendshipError,
} from './errors'
import { orderPair } from './value-objects'

export type FriendshipStatus = 'pending' | 'accepted' | 'declined'
export type FriendshipProps = {
  lo: number
  hi: number
  status: FriendshipStatus
  requesterId: number
  createdAt: Date
  acceptedAt: Date | null
  /** When the addressee declined, `null` while the request has never been declined. Anchors the
   * re-request cooldown; `null` on a `declined` row only for rows written before migration 0004. */
  declinedAt: Date | null
}
const COOLDOWN_MS = 24 * 3600_000

export class Friendship {
  private events: DomainEvent[] = []
  private removed = false
  private constructor(private p: FriendshipProps) {}

  static request(from: number, to: number, now = new Date()): Friendship {
    if (from === to) throw new SelfFriendshipError()
    const { lo, hi } = orderPair(from, to)
    const f = new Friendship({
      lo,
      hi,
      status: 'pending',
      requesterId: from,
      createdAt: now,
      acceptedAt: null,
      declinedAt: null,
    })
    f.events.push({
      type: 'FriendRequested',
      occurredAt: now,
      payload: { requesterId: from, addresseeId: to },
    })
    return f
  }
  static rehydrate(p: FriendshipProps): Friendship {
    return new Friendship({ ...p })
  }

  get props(): Readonly<FriendshipProps> {
    return this.p
  }
  get isRemoved() {
    return this.removed
  }
  get addresseeId() {
    return this.p.requesterId === this.p.lo ? this.p.hi : this.p.lo
  }
  private other(of: number) {
    return of === this.p.lo ? this.p.hi : this.p.lo
  }

  accept(by: number, now = new Date()): void {
    if (this.p.status === 'accepted') return
    if (this.p.status !== 'pending' || by !== this.addresseeId) throw new NotRequestAddressee()
    this.p.status = 'accepted'
    this.p.acceptedAt = now
    this.events.push({
      type: 'FriendshipAccepted',
      occurredAt: now,
      payload: { userLo: this.p.lo, userHi: this.p.hi, acceptedBy: by },
    })
  }
  counterRequest(by: number, now = new Date()): void {
    this.accept(by, now)
  }
  decline(by: number, now = new Date()): void {
    if (this.p.status !== 'pending' || by !== this.addresseeId) throw new NotRequestAddressee()
    this.p.status = 'declined'
    this.p.declinedAt = now
    this.events.push({
      type: 'FriendRequestDeclined',
      occurredAt: now,
      payload: { requesterId: this.p.requesterId, addresseeId: by },
    })
  }
  private assertParticipant(by: number): void {
    if (by !== this.p.lo && by !== this.p.hi) throw new NotRequestAddressee()
  }
  remove(by: number, now = new Date()): void {
    this.assertParticipant(by)
    if (this.p.status !== 'accepted') throw new FriendshipNotFound()
    this.removed = true
    this.events.push({
      type: 'FriendshipRemoved',
      occurredAt: now,
      payload: { removedBy: by, other: this.other(by) },
    })
  }
  cancel(by: number): void {
    if (this.p.status !== 'pending' || by !== this.p.requesterId) throw new NotRequestAddressee()
    this.removed = true
  }
  /**
   * Restarts contact after a decline. The person who *declined* may reach out whenever they like
   * — they are the one who said no, and a change of mind is not harassment. The original
   * requester has to wait out a 24h cooldown measured **from the decline**, not from their
   * original request: anchoring it at `createdAt` would let a request that sat unanswered for a
   * week be re-sent the instant it was declined. Rows written before migration 0004 have no
   * `declinedAt`, so they fall back to `createdAt` (the old behaviour) instead of being
   * permanently blocked or instantly repeatable.
   */
  rerequest(by: number, now: Date): void {
    this.assertParticipant(by)
    if (this.p.status !== 'declined') throw new NotRequestAddressee()
    if (by === this.p.requesterId) {
      const since = this.p.declinedAt ?? this.p.createdAt
      if (now.getTime() - since.getTime() < COOLDOWN_MS) throw new RequestCooldown()
    }
    this.p.status = 'pending'
    this.p.requesterId = by
    this.p.createdAt = now
    this.p.acceptedAt = null
    this.events.push({
      type: 'FriendRequested',
      occurredAt: now,
      payload: { requesterId: by, addresseeId: this.other(by) },
    })
  }
  pullEvents(): DomainEvent[] {
    const out = this.events
    this.events = []
    return out
  }
}

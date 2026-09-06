import { describe, expect, it } from 'bun:test'
import { Friendship } from './friendship'

const t0 = new Date('2026-09-06T00:00:00Z')
describe('Friendship', () => {
  it('request orders the pair, is pending, emits FriendRequested', () => {
    const f = Friendship.request(7, 3, t0)
    expect(f.props).toMatchObject({ lo: 3, hi: 7, status: 'pending', requesterId: 7 })
    expect(f.addresseeId).toBe(3)
    expect(f.pullEvents().map((e) => e.type)).toEqual(['FriendRequested'])
  })
  it('rejects self', () => {
    expect(() => Friendship.request(1, 1)).toThrow(
      expect.objectContaining({ code: 'self_friendship' }),
    )
  })
  it('accept by addressee → accepted + event; by requester → not_addressee; twice → no-op', () => {
    const f = Friendship.request(7, 3, t0)
    f.pullEvents()
    expect(() => f.accept(7)).toThrow(expect.objectContaining({ code: 'not_addressee' }))
    f.accept(3, t0)
    expect(f.props.status).toBe('accepted')
    expect(f.props.acceptedAt).toEqual(t0)
    f.accept(3, t0)
    expect(f.pullEvents().map((e) => e.type)).toEqual(['FriendshipAccepted'])
  })
  it('decline by addressee → declined + FriendRequestDeclined', () => {
    const f = Friendship.request(7, 3)
    f.pullEvents()
    f.decline(3)
    expect(f.props.status).toBe('declined')
    expect(f.pullEvents().map((e) => e.type)).toEqual(['FriendRequestDeclined'])
  })
  it('counterRequest by addressee accepts (mutual request = consent)', () => {
    const f = Friendship.request(7, 3)
    f.pullEvents()
    f.counterRequest(3, t0)
    expect(f.props.status).toBe('accepted')
    expect(f.pullEvents().map((e) => e.type)).toEqual(['FriendshipAccepted'])
  })
  it('remove works only from accepted and emits FriendshipRemoved', () => {
    const f = Friendship.request(7, 3)
    f.accept(3)
    f.pullEvents()
    f.remove(7)
    expect(f.isRemoved).toBe(true)
    expect(f.pullEvents()[0]).toMatchObject({
      type: 'FriendshipRemoved',
      payload: { removedBy: 7, other: 3 },
    })
    const g = Friendship.request(1, 2)
    expect(() => g.remove(1)).toThrow(expect.objectContaining({ code: 'friendship_not_found' }))
  })
  it('cancel: requester withdraws a pending request silently; addressee cannot cancel', () => {
    const f = Friendship.request(7, 3)
    f.pullEvents()
    expect(() => f.cancel(3)).toThrow(expect.objectContaining({ code: 'not_addressee' }))
    f.cancel(7)
    expect(f.isRemoved).toBe(true)
    expect(f.pullEvents()).toEqual([])
  })
  it('rerequest after decline: other side within 24h → cooldown; after 24h → pending with new requester', () => {
    const f = Friendship.request(7, 3, t0)
    f.decline(3)
    f.pullEvents()
    expect(() => f.rerequest(7, new Date(t0.getTime() + 3600_000))).toThrow(
      expect.objectContaining({ code: 'request_cooldown' }),
    )
    const later = new Date(t0.getTime() + 25 * 3600_000)
    f.rerequest(3, later)
    expect(f.props).toMatchObject({ status: 'pending', requesterId: 3, createdAt: later })
    expect(f.pullEvents().map((e) => e.type)).toEqual(['FriendRequested'])
  })
})

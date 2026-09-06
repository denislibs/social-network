import { describe, expect, it } from 'bun:test'
import { Community } from './community'

const mk = () =>
  Community.create({
    ownerId: 1,
    name: ' Кино ',
    screenName: 'kino_club',
    topic: 'cinema',
    description: null,
  })

describe('Community', () => {
  it('creator is admin, name trimmed, CommunityCreated emitted', () => {
    const c = mk()
    expect(c.roleOf(1)).toBe('admin')
    expect(c.props.name).toBe('Кино')
    expect(c.pullEvents().map((e) => e.type)).toEqual(['CommunityCreated'])
  })
  it('join is idempotent and emits once', () => {
    const c = mk()
    c.pullEvents()
    c.join(2)
    c.join(2)
    expect(c.roleOf(2)).toBe('member')
    expect(c.pullEvents().map((e) => e.type)).toEqual(['CommunityJoined'])
  })
  it('last admin cannot leave; member can; non-member leave is no-op', () => {
    const c = mk()
    c.join(2)
    c.pullEvents()
    expect(() => c.leave(1)).toThrow(expect.objectContaining({ code: 'last_admin' }))
    c.leave(2)
    c.leave(9)
    expect(c.roleOf(2)).toBeNull()
    expect(c.pullEvents().map((e) => e.type)).toEqual(['CommunityLeft'])
  })
  it('an admin can leave when another admin remains', () => {
    const c = Community.rehydrate({
      id: 1,
      screenName: 'kino',
      name: 'Кино',
      description: null,
      topic: 'cinema',
      createdAt: new Date(),
      members: new Map([
        [1, 'admin'],
        [2, 'admin'],
        [3, 'member'],
      ]),
    })
    c.leave(1)
    expect(c.roleOf(1)).toBeNull()
    expect(c.adminCount()).toBe(1)
    expect(c.pullEvents().map((e) => e.type)).toEqual(['CommunityLeft'])
  })
  it('rejects names shorter than 2 or longer than 120', () => {
    expect(() =>
      Community.create({
        ownerId: 1,
        name: 'x',
        screenName: 'ok_name',
        topic: 'it',
        description: null,
      }),
    ).toThrow(expect.objectContaining({ code: 'invalid_community_name' }))
  })
})

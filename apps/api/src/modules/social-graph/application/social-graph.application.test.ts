import { beforeEach, describe, expect, it } from 'bun:test'
import { EventBus } from '../../../kernel/event-bus'
import { KERNEL } from '../../../kernel/tokens'
import { AcceptFriendRequest } from './commands/accept-friend-request'
import { CreateCommunity } from './commands/create-community'
import { DeclineFriendRequest } from './commands/decline-friend-request'
import { HideSuggestion } from './commands/hide-suggestion'
import { JoinCommunity } from './commands/join-community'
import { LeaveCommunity } from './commands/leave-community'
import { RemoveFriend } from './commands/remove-friend'
import { SendFriendRequest } from './commands/send-friend-request'
import { SOCIAL } from './ports'
import { GetRelation } from './queries/get-relation'
import { GetSuggestedFriends } from './queries/get-suggested-friends'
import { registerSocialGraphHandlers } from './register'
import { createSocialGraphTestContainer } from './testing/container'
import type { InMemoryFollows, InMemorySocialRead, InMemorySuggestionCache } from './testing/fakes'

let c: ReturnType<typeof createSocialGraphTestContainer>, published: string[]
const exec = <T>(cmd: { __result: T }) =>
  c.get(KERNEL.CommandBus).execute(cmd as never) as Promise<T>
const ask = <T>(q: { __result: T }) => c.get(KERNEL.QueryBus).ask(q as never) as Promise<T>
beforeEach(async () => {
  published = []
  const events = new EventBus()
  for (const t of [
    'FriendRequested',
    'FriendshipAccepted',
    'FriendRequestDeclined',
    'FriendshipRemoved',
    'CommunityCreated',
    'CommunityJoined',
    'CommunityLeft',
  ])
    events.subscribe(t, (e) => {
      published.push(`${e.type}:${JSON.stringify(e.payload)}`)
    })
  c = createSocialGraphTestContainer({ events })
  await registerSocialGraphHandlers(c)
})

describe('friend requests', () => {
  it('request → outgoing/incoming relation, requester follows addressee, event published', async () => {
    expect(await exec(new SendFriendRequest({ me: 1, other: 2 }))).toBe('outgoing')
    expect(await ask(new GetRelation(2, 1))).toBe('incoming')
    expect(
      (c.get(SOCIAL.FollowRepository) as InMemoryFollows).has(1, { type: 'user', id: 2 }),
    ).toBe(true)
    expect(published).toEqual(['FriendRequested:{"requesterId":1,"addresseeId":2}'])
  })
  it('accept → friends both ways, FriendshipAccepted published, follow row kept', async () => {
    await exec(new SendFriendRequest({ me: 1, other: 2 }))
    expect(await exec(new AcceptFriendRequest({ me: 2, other: 1 }))).toBe('friends')
    expect(await ask(new GetRelation(1, 2))).toBe('friends')
    expect(published.at(-1)).toContain('FriendshipAccepted')
  })
  it('accept by requester → 403 not_addressee', async () => {
    await exec(new SendFriendRequest({ me: 1, other: 2 }))
    await expect(exec(new AcceptFriendRequest({ me: 1, other: 2 }))).rejects.toMatchObject({
      code: 'not_addressee',
    })
  })
  it('mutual request = accepted', async () => {
    await exec(new SendFriendRequest({ me: 1, other: 2 }))
    expect(await exec(new SendFriendRequest({ me: 2, other: 1 }))).toBe('friends')
  })
  it('decline keeps the follow and publishes no notification-worthy accept', async () => {
    await exec(new SendFriendRequest({ me: 1, other: 2 }))
    expect(await exec(new DeclineFriendRequest({ me: 2, other: 1 }))).toBe('none')
    expect(
      (c.get(SOCIAL.FollowRepository) as InMemoryFollows).has(1, { type: 'user', id: 2 }),
    ).toBe(true)
    expect(await ask(new GetRelation(1, 2))).toBe('none')
  })
  it('re-request within 24h after decline → request_cooldown; after → outgoing again', async () => {
    const now = { t: new Date('2026-09-06T00:00:00Z') }
    c = createSocialGraphTestContainer({ now: () => now.t })
    await registerSocialGraphHandlers(c)
    await exec(new SendFriendRequest({ me: 1, other: 2 }))
    await exec(new DeclineFriendRequest({ me: 2, other: 1 }))
    await expect(exec(new SendFriendRequest({ me: 1, other: 2 }))).rejects.toMatchObject({
      code: 'request_cooldown',
    })
    now.t = new Date('2026-09-07T01:00:00Z')
    expect(await exec(new SendFriendRequest({ me: 1, other: 2 }))).toBe('outgoing')
  })
  it('remove on own pending request = cancel: none, follow removed, no event', async () => {
    await exec(new SendFriendRequest({ me: 1, other: 2 }))
    published.length = 0
    expect(await exec(new RemoveFriend({ me: 1, other: 2 }))).toBe('none')
    expect(
      (c.get(SOCIAL.FollowRepository) as InMemoryFollows).has(1, { type: 'user', id: 2 }),
    ).toBe(false)
    expect(published).toEqual([])
  })
  it('remove → none, removed side now follows the remover', async () => {
    await exec(new SendFriendRequest({ me: 1, other: 2 }))
    await exec(new AcceptFriendRequest({ me: 2, other: 1 }))
    expect(await exec(new RemoveFriend({ me: 2, other: 1 }))).toBe('none')
    expect(
      (c.get(SOCIAL.FollowRepository) as InMemoryFollows).has(1, { type: 'user', id: 2 }),
    ).toBe(true)
  })
  it('self request → 400', async () => {
    await expect(exec(new SendFriendRequest({ me: 1, other: 1 }))).rejects.toMatchObject({
      code: 'self_friendship',
    })
  })
  it('graph changes invalidate the suggestion cache for both users', async () => {
    const cache = c.get(SOCIAL.SuggestionCache) as InMemorySuggestionCache
    await cache.set(1, [], 600)
    await cache.set(2, [], 600)
    await exec(new SendFriendRequest({ me: 1, other: 2 }))
    expect(await cache.get(1)).toBeNull()
    expect(await cache.get(2)).toBeNull()
  })
})

describe('communities', () => {
  it('create → creator admin + member count 1; join/leave; last admin blocked', async () => {
    const dto = await exec(
      new CreateCommunity({
        me: 1,
        name: 'Кино',
        screenName: 'kino',
        topic: 'cinema',
        description: null,
      }),
    )
    expect(dto).toMatchObject({ membership: 'admin', membersCount: 1, isFollowing: true })
    expect(await exec(new JoinCommunity({ me: 2, communityId: dto.id }))).toEqual({
      membership: 'member',
      isFollowing: true,
    })
    expect(await exec(new LeaveCommunity({ me: 2, communityId: dto.id }))).toEqual({
      membership: 'none',
      isFollowing: false,
    })
    await expect(exec(new LeaveCommunity({ me: 1, communityId: dto.id }))).rejects.toMatchObject({
      code: 'last_admin',
    })
    expect(published.filter((p) => p.startsWith('Community')).map((p) => p.split(':')[0])).toEqual([
      'CommunityCreated',
      'CommunityJoined',
      'CommunityLeft',
    ])
  })
  it('unknown community → 404', async () => {
    await expect(exec(new JoinCommunity({ me: 1, communityId: 999 }))).rejects.toMatchObject({
      code: 'community_not_found',
    })
  })
})

describe('suggestions', () => {
  it('reads through the cache and hides', async () => {
    const read = c.get(SOCIAL.ReadModel) as InMemorySocialRead
    read.suggestionsFor.set(1, [
      {
        id: 5,
        firstName: 'A',
        lastName: 'B',
        screenName: null,
        city: null,
        isVerified: false,
        lastSeenAt: null,
        mutual: 2,
        sameCity: false,
      },
    ])
    expect((await ask(new GetSuggestedFriends(1))).map((s) => s.id)).toEqual([5])
    read.suggestionsFor.set(1, []) // cache should still serve
    expect((await ask(new GetSuggestedFriends(1))).map((s) => s.id)).toEqual([5])
    await exec(new HideSuggestion({ me: 1, other: 5 })) // invalidates
    expect(await ask(new GetSuggestedFriends(1))).toEqual([])
  })
})

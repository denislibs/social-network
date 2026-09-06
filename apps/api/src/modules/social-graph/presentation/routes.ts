import { TOPICS } from '@vkc/contracts'
import { Elysia, type TSchema, t } from 'elysia'
import type { Container } from '../../../kernel/di'
import { authPlugin } from '../../../kernel/http/auth-plugin'
import { KERNEL } from '../../../kernel/tokens'
import { SearchUsers } from '../../identity'
import { AcceptFriendRequest } from '../application/commands/accept-friend-request'
import { CreateCommunity } from '../application/commands/create-community'
import { DeclineFriendRequest } from '../application/commands/decline-friend-request'
import { FollowCommunity } from '../application/commands/follow-community'
import { HideSuggestion } from '../application/commands/hide-suggestion'
import { JoinCommunity } from '../application/commands/join-community'
import { LeaveCommunity } from '../application/commands/leave-community'
import { RemoveFriend } from '../application/commands/remove-friend'
import { SendFriendRequest } from '../application/commands/send-friend-request'
import { UnfollowCommunity } from '../application/commands/unfollow-community'
import { GetCommunity } from '../application/queries/get-community'
import { GetCommunityMembers } from '../application/queries/get-community-members'
import { GetCounters } from '../application/queries/get-counters'
import { GetFollowers } from '../application/queries/get-followers'
import { GetFriendRequests } from '../application/queries/get-friend-requests'
import { GetFriends } from '../application/queries/get-friends'
import { GetMyCommunities } from '../application/queries/get-my-communities'
import { GetSuggestedFriends } from '../application/queries/get-suggested-friends'
import { ResolveHandle } from '../application/queries/resolve-handle'
import { SearchCommunities } from '../application/queries/search-communities'

const userCellSchema = t.Object({
  id: t.Number(),
  firstName: t.String(),
  lastName: t.String(),
  screenName: t.Nullable(t.String()),
  city: t.Nullable(t.String()),
  isVerified: t.Boolean(),
  lastSeenAt: t.Nullable(t.String()),
})
const pageOf = <T extends TSchema>(item: T) =>
  t.Object({ items: t.Array(item), nextCursor: t.Nullable(t.String()) })
const relationSchema = t.UnionEnum(['none', 'outgoing', 'incoming', 'friends', 'self'])
const membershipSchema = t.UnionEnum(['none', 'member', 'editor', 'admin'])
const topicSchema = t.UnionEnum(TOPICS)
const communityDtoSchema = t.Object({
  id: t.Number(),
  screenName: t.String(),
  name: t.String(),
  description: t.Nullable(t.String()),
  topic: topicSchema,
  isVerified: t.Boolean(),
  membersCount: t.Number(),
  membership: membershipSchema,
  isFollowing: t.Boolean(),
})
const communityCellSchema = t.Object({
  id: t.Number(),
  screenName: t.String(),
  name: t.String(),
  topic: topicSchema,
  isVerified: t.Boolean(),
  membersCount: t.Number(),
})
const suggestionSchema = t.Object({
  id: t.Number(),
  firstName: t.String(),
  lastName: t.String(),
  screenName: t.Nullable(t.String()),
  city: t.Nullable(t.String()),
  isVerified: t.Boolean(),
  lastSeenAt: t.Nullable(t.String()),
  mutual: t.Number(),
  sameCity: t.Boolean(),
})
const handleSchema = t.Object({
  kind: t.UnionEnum(['user', 'community']),
  id: t.Number(),
})
const countersSchema = t.Object({
  friends: t.Number(),
  followers: t.Number(),
  communities: t.Number(),
  incomingRequests: t.Number(),
})
const cursorQuery = t.Object({ cursor: t.Optional(t.String()) })

export function socialGraphRoutes(c: Container) {
  const d = {
    commands: c.get(KERNEL.CommandBus),
    queries: c.get(KERNEL.QueryBus),
  }

  return new Elysia()
    .use(authPlugin(c.get(KERNEL.SessionResolver)))
    .get(
      '/users/:id/friends',
      ({ params, query }) => d.queries.ask(new GetFriends(params.id, query.cursor)),
      {
        auth: true,
        params: t.Object({ id: t.Numeric() }),
        query: cursorQuery,
        response: { 200: pageOf(userCellSchema) },
      },
    )
    .get(
      '/users/:id/followers',
      ({ params, query }) => d.queries.ask(new GetFollowers(params.id, query.cursor)),
      {
        auth: true,
        params: t.Object({ id: t.Numeric() }),
        query: cursorQuery,
        response: { 200: pageOf(userCellSchema) },
      },
    )
    .get(
      '/me/friends/requests',
      ({ query, user }) => d.queries.ask(new GetFriendRequests(user.id, query.dir, query.cursor)),
      {
        auth: true,
        query: t.Object({
          dir: t.UnionEnum(['incoming', 'outgoing']),
          cursor: t.Optional(t.String()),
        }),
        response: { 200: pageOf(userCellSchema) },
      },
    )
    .post(
      '/friends/:id/request',
      async ({ params, user }) => ({
        relation: await d.commands.execute(
          new SendFriendRequest({ me: user.id, other: params.id }),
        ),
      }),
      {
        auth: true,
        params: t.Object({ id: t.Numeric() }),
        response: { 200: t.Object({ relation: relationSchema }) },
      },
    )
    .post(
      '/friends/:id/accept',
      async ({ params, user }) => ({
        relation: await d.commands.execute(
          new AcceptFriendRequest({ me: user.id, other: params.id }),
        ),
      }),
      {
        auth: true,
        params: t.Object({ id: t.Numeric() }),
        response: { 200: t.Object({ relation: relationSchema }) },
      },
    )
    .post(
      '/friends/:id/decline',
      async ({ params, user }) => ({
        relation: await d.commands.execute(
          new DeclineFriendRequest({ me: user.id, other: params.id }),
        ),
      }),
      {
        auth: true,
        params: t.Object({ id: t.Numeric() }),
        response: { 200: t.Object({ relation: relationSchema }) },
      },
    )
    .delete(
      '/friends/:id',
      async ({ params, user }) => ({
        relation: await d.commands.execute(new RemoveFriend({ me: user.id, other: params.id })),
      }),
      {
        auth: true,
        params: t.Object({ id: t.Numeric() }),
        response: { 200: t.Object({ relation: relationSchema }) },
      },
    )
    .get('/me/counters', ({ user }) => d.queries.ask(new GetCounters(user.id)), {
      auth: true,
      response: { 200: countersSchema },
    })
    .get(
      '/me/friends/suggestions',
      async ({ user }) => ({ items: await d.queries.ask(new GetSuggestedFriends(user.id)) }),
      {
        auth: true,
        response: { 200: t.Object({ items: t.Array(suggestionSchema) }) },
      },
    )
    .post(
      '/me/friends/suggestions/:id/hide',
      async ({ params, set, user }) => {
        await d.commands.execute(new HideSuggestion({ me: user.id, other: params.id }))
        set.status = 204
      },
      {
        auth: true,
        params: t.Object({ id: t.Numeric() }),
      },
    )
    .get(
      '/communities/:id',
      async ({ params, viewer }) => ({
        community: await d.queries.ask(new GetCommunity(params.id, viewer?.id ?? null)),
      }),
      {
        optionalAuth: true,
        // Named `id` (not `idOrScreen`) so the router's radix tree can share this path segment
        // with `/communities/:id/members` etc. — memoirist requires the same param name at a
        // shared tree position across every route in the app, even though this route accepts
        // either a numeric id or a screen name (see `GetCommunity`) while the others require a
        // numeric id.
        params: t.Object({ id: t.String() }),
        response: { 200: t.Object({ community: communityDtoSchema }) },
      },
    )
    .get(
      '/communities/:id/members',
      ({ params, query }) => d.queries.ask(new GetCommunityMembers(params.id, query.cursor)),
      {
        auth: true,
        params: t.Object({ id: t.Numeric() }),
        query: cursorQuery,
        response: { 200: pageOf(userCellSchema) },
      },
    )
    .get(
      '/me/communities',
      async ({ user }) => ({ items: await d.queries.ask(new GetMyCommunities(user.id)) }),
      {
        auth: true,
        response: { 200: t.Object({ items: t.Array(communityCellSchema) }) },
      },
    )
    .post(
      '/communities',
      async ({ body, set, user }) => {
        const community = await d.commands.execute(
          new CreateCommunity({
            me: user.id,
            name: body.name,
            screenName: body.screenName,
            topic: body.topic,
            description: body.description ?? null,
          }),
        )
        set.status = 201
        return { community }
      },
      {
        auth: true,
        body: t.Object({
          name: t.String(),
          screenName: t.String(),
          topic: topicSchema,
          description: t.Optional(t.Nullable(t.String())),
        }),
        response: { 201: t.Object({ community: communityDtoSchema }) },
      },
    )
    .post(
      '/communities/:id/join',
      ({ params, user }) =>
        d.commands.execute(new JoinCommunity({ me: user.id, communityId: params.id })),
      {
        auth: true,
        params: t.Object({ id: t.Numeric() }),
        response: {
          200: t.Object({ membership: membershipSchema, isFollowing: t.Boolean() }),
        },
      },
    )
    .delete(
      '/communities/:id/join',
      ({ params, user }) =>
        d.commands.execute(new LeaveCommunity({ me: user.id, communityId: params.id })),
      {
        auth: true,
        params: t.Object({ id: t.Numeric() }),
        response: {
          200: t.Object({ membership: membershipSchema, isFollowing: t.Boolean() }),
        },
      },
    )
    .post(
      '/communities/:id/follow',
      ({ params, user }) =>
        d.commands.execute(new FollowCommunity({ me: user.id, communityId: params.id })),
      {
        auth: true,
        params: t.Object({ id: t.Numeric() }),
        response: { 200: t.Object({ isFollowing: t.Literal(true) }) },
      },
    )
    .delete(
      '/communities/:id/follow',
      ({ params, user }) =>
        d.commands.execute(new UnfollowCommunity({ me: user.id, communityId: params.id })),
      {
        auth: true,
        params: t.Object({ id: t.Numeric() }),
        response: { 200: t.Object({ isFollowing: t.Literal(false) }) },
      },
    )
    .get(
      '/search',
      async ({ query }) => {
        const kind = query.kind ?? 'all'
        const [users, communities] = await Promise.all([
          kind === 'communities' ? [] : d.queries.ask(new SearchUsers(query.q)),
          kind === 'users' ? [] : d.queries.ask(new SearchCommunities(query.q)),
        ])
        return { users, communities }
      },
      {
        auth: true,
        query: t.Object({
          // A one-character query matches a trigram index on nothing useful and would scan the
          // whole table for a result nobody can read; the cap keeps a pathological query from
          // becoming a pathological trigram comparison.
          q: t.String({ minLength: 2, maxLength: 64 }),
          kind: t.Optional(t.UnionEnum(['all', 'users', 'communities'])),
        }),
        response: {
          200: t.Object({
            users: t.Array(userCellSchema),
            communities: t.Array(communityCellSchema),
          }),
        },
      },
    )
    .get('/handles/:handle', ({ params }) => d.queries.ask(new ResolveHandle(params.handle)), {
      auth: true,
      params: t.Object({ handle: t.String() }),
      response: { 200: handleSchema },
    })
}

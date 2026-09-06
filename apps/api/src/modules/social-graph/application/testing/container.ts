import { CommandBus } from '../../../../kernel/command-bus'
import { Container } from '../../../../kernel/di'
import { EventBus } from '../../../../kernel/event-bus'
import { QueryBus } from '../../../../kernel/query-bus'
import { KERNEL } from '../../../../kernel/tokens'
import { SOCIAL } from '../ports'
import {
  InMemoryCommunities,
  InMemoryFollows,
  InMemoryFriendships,
  InMemorySocialRead,
  InMemorySuggestionCache,
  InMemorySuggestionHider,
} from './fakes'

/** Application-layer test container: social-graph ports bound to in-memory fakes, fresh buses. */
export function createSocialGraphTestContainer(
  o: { events?: EventBus; now?: () => Date } = {},
): Container {
  const c = new Container({ defaultScope: 'Singleton' })
  const friendships = new InMemoryFriendships()
  const read = new InMemorySocialRead(friendships)
  c.bind(SOCIAL.FriendshipRepository).toConstantValue(friendships)
  c.bind(SOCIAL.FollowRepository).toConstantValue(new InMemoryFollows())
  c.bind(SOCIAL.CommunityRepository).toConstantValue(new InMemoryCommunities())
  c.bind(SOCIAL.ReadModel).toConstantValue(read)
  c.bind(SOCIAL.SuggestionCache).toConstantValue(new InMemorySuggestionCache())
  c.bind(SOCIAL.SuggestionHider).toConstantValue(new InMemorySuggestionHider())
  c.bind(SOCIAL.Clock).toConstantValue({ now: o.now ?? (() => new Date()) })
  c.bind(KERNEL.CommandBus).toConstantValue(new CommandBus())
  c.bind(KERNEL.QueryBus).toConstantValue(new QueryBus())
  c.bind(KERNEL.EventBus).toConstantValue(o.events ?? new EventBus())
  // Cross-context read port (identity's GetProfile depends on it) served by the same fake.
  c.bind(KERNEL.SocialRead).toConstantValue(read)
  return c
}

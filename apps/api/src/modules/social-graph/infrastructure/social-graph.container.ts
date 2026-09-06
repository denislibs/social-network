import type { Container } from '../../../kernel/di'
import { KERNEL } from '../../../kernel/tokens'
import { SOCIAL } from '../application/ports'
import { DrizzleCommunityRepository } from './drizzle-community-repository'
import { DrizzleFollowRepository } from './drizzle-follow-repository'
import { DrizzleFriendshipRepository } from './drizzle-friendship-repository'
import { DrizzleSocialReadModel } from './drizzle-social-read-model'
import { DrizzleSuggestionHider } from './drizzle-suggestion-hider'
import { DrizzleUserExistence } from './drizzle-user-existence'
import { RedisSuggestionCache } from './redis-suggestion-cache'

/** Scope defaults to Singleton — set by `createKernelContainer` (`kernel/container.ts`). */
export function bindSocialGraphInfrastructure(c: Container): void {
  c.bind(SOCIAL.FriendshipRepository).toResolvedValue(
    (db) => new DrizzleFriendshipRepository(db),
    [KERNEL.Db],
  )
  c.bind(SOCIAL.FollowRepository).toResolvedValue(
    (db) => new DrizzleFollowRepository(db),
    [KERNEL.Db],
  )
  c.bind(SOCIAL.CommunityRepository).toResolvedValue(
    (db) => new DrizzleCommunityRepository(db),
    [KERNEL.Db],
  )
  c.bind(SOCIAL.ReadModel).toResolvedValue((db) => new DrizzleSocialReadModel(db), [KERNEL.Db])
  // Cross-context read port: identity's GetProfile (Task 6) depends on relation/counters, served
  // by the same read-model instance social-graph itself uses.
  c.bind(KERNEL.SocialRead).toResolvedValue((rm) => rm, [SOCIAL.ReadModel])
  c.bind(SOCIAL.SuggestionCache).toResolvedValue((r) => new RedisSuggestionCache(r), [KERNEL.Redis])
  c.bind(SOCIAL.SuggestionHider).toResolvedValue(
    (db) => new DrizzleSuggestionHider(db),
    [KERNEL.Db],
  )
  c.bind(SOCIAL.UserExists).toResolvedValue((db) => new DrizzleUserExistence(db), [KERNEL.Db])
  c.bind(SOCIAL.Clock).toConstantValue({ now: () => new Date() })
}

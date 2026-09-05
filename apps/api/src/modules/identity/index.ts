import type Redis from 'ioredis'
import type { Db } from '../../db/client'
import type { CommandBus } from '../../kernel/command-bus'
import type { EventBus } from '../../kernel/event-bus'
import type { QueryBus } from '../../kernel/query-bus'
import { registerIdentityHandlers } from './application/register'
import { BunPasswordHasher } from './infrastructure/bun-password-hasher'
import { DrizzleUserRepository } from './infrastructure/drizzle-user-repository'
import { RedisSessionStore } from './infrastructure/redis-session-store'
import { identityRoutes } from './presentation/routes'

export async function identityModule(d: {
  db: Db
  redis: Redis
  commands: CommandBus
  queries: QueryBus
  events: EventBus
  cookieSecure: boolean
}) {
  const users = new DrizzleUserRepository(d.db)
  const sessions = new RedisSessionStore(d.redis)
  await registerIdentityHandlers({
    users,
    sessions,
    hasher: new BunPasswordHasher(),
    commands: d.commands,
    queries: d.queries,
    events: d.events,
  })
  return {
    plugin: identityRoutes({
      commands: d.commands,
      queries: d.queries,
      sessions,
      cookieSecure: d.cookieSecure,
    }),
  }
}

import type Redis from 'ioredis'
import type { Db } from '../db/client'
import type { CommandBus } from './command-bus'
import type { EventBus } from './event-bus'
import type { QueryBus } from './query-bus'

export type AppDeps = {
  db: Db
  redis: Redis
  commands: CommandBus
  queries: QueryBus
  events: EventBus
  cookieSecure: boolean
}

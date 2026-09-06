import type Redis from 'ioredis'
import type { Db } from '../db/client'
import type { CommandBus } from './command-bus'
import { token } from './di'
import type { EventBus } from './event-bus'
import type { QueryBus } from './query-bus'
import type { SocialReadPort } from './social-read'

export interface SessionResolver {
  get(token: string): Promise<{ userId: number } | null>
  touch(token: string): Promise<void>
}

export const KERNEL = {
  Db: token<Db>('Db'),
  Redis: token<Redis>('Redis'),
  CommandBus: token<CommandBus>('CommandBus'),
  QueryBus: token<QueryBus>('QueryBus'),
  EventBus: token<EventBus>('EventBus'),
  Config: token<{ cookieSecure: boolean }>('AppConfig'),
  SessionResolver: token<SessionResolver>('SessionResolver'),
  SocialRead: token<SocialReadPort>('SocialRead'),
}

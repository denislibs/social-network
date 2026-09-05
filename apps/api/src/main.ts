import { buildApp } from './app'
import { config } from './config'
import { createDb } from './db/client'
import { CommandBus } from './kernel/command-bus'
import { EventBus } from './kernel/event-bus'
import { QueryBus } from './kernel/query-bus'
import { createRedis } from './redis'

const app = await buildApp({
  db: createDb(config.databaseUrl),
  redis: createRedis(config.redisUrl),
  commands: new CommandBus(),
  queries: new QueryBus(),
  events: new EventBus(),
  cookieSecure: config.cookieSecure,
})
app.listen(config.apiPort)
console.log(`api on http://localhost:${config.apiPort}/api/v1/health`)

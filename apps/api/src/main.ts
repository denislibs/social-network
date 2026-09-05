import { buildApp } from './app'
import { config } from './config'
import { CommandBus } from './kernel/command-bus'
import { EventBus } from './kernel/event-bus'
import { QueryBus } from './kernel/query-bus'

const app = buildApp({
  commands: new CommandBus(),
  queries: new QueryBus(),
  events: new EventBus(),
})
app.listen(config.apiPort)
console.log(`api on http://localhost:${config.apiPort}/api/v1/health`)

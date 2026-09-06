import { CommandBus } from '../../../../kernel/command-bus'
import { Container } from '../../../../kernel/di'
import { EventBus } from '../../../../kernel/event-bus'
import { QueryBus } from '../../../../kernel/query-bus'
import { KERNEL } from '../../../../kernel/tokens'
import { NOTIFICATIONS } from '../ports'
import { InMemoryNotifications } from './fakes'

/** Application-layer test container: notifications ports bound to one in-memory fake, fresh buses. */
export function createNotificationsTestContainer(o: { events?: EventBus } = {}): Container {
  const c = new Container({ defaultScope: 'Singleton' })
  const notifications = new InMemoryNotifications()
  c.bind(NOTIFICATIONS.Repository).toConstantValue(notifications)
  c.bind(NOTIFICATIONS.ReadModel).toConstantValue(notifications)
  c.bind(KERNEL.CommandBus).toConstantValue(new CommandBus())
  c.bind(KERNEL.QueryBus).toConstantValue(new QueryBus())
  c.bind(KERNEL.EventBus).toConstantValue(o.events ?? new EventBus())
  return c
}

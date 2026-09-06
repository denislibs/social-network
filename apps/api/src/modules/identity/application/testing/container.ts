import { CommandBus } from '../../../../kernel/command-bus'
import { Container } from '../../../../kernel/di'
import { EventBus } from '../../../../kernel/event-bus'
import { QueryBus } from '../../../../kernel/query-bus'
import { KERNEL } from '../../../../kernel/tokens'
import type { PasswordHasher } from '../ports'
import { IDENTITY } from '../ports'
import { FakeHasher, InMemorySessions, InMemoryUserReadModel, InMemoryUsers } from './fakes'

/** Application-layer test container: identity ports bound to in-memory fakes, fresh buses. */
export function createIdentityTestContainer(
  o: { hasher?: PasswordHasher; events?: EventBus } = {},
): Container {
  const c = new Container({ defaultScope: 'Singleton' })
  const users = new InMemoryUsers()
  c.bind(IDENTITY.UserRepository).toConstantValue(users)
  c.bind(IDENTITY.UserReadModel).toConstantValue(new InMemoryUserReadModel(users))
  c.bind(IDENTITY.SessionStore).toConstantValue(new InMemorySessions())
  c.bind(IDENTITY.PasswordHasher).toConstantValue(o.hasher ?? new FakeHasher())
  c.bind(KERNEL.CommandBus).toConstantValue(new CommandBus())
  c.bind(KERNEL.QueryBus).toConstantValue(new QueryBus())
  c.bind(KERNEL.EventBus).toConstantValue(o.events ?? new EventBus())
  return c
}

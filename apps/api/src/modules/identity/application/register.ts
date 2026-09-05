import type { CommandBus } from '../../../kernel/command-bus'
import type { EventBus } from '../../../kernel/event-bus'
import type { QueryBus } from '../../../kernel/query-bus'
import { Login, loginHandler } from './commands/login'
import { Logout, logoutHandler } from './commands/logout'
import { LogoutAll, logoutAllHandler } from './commands/logout-all'
import { RegisterUser, registerUserHandler } from './commands/register-user'
import type { PasswordHasher, SessionStore, UserRepository } from './ports'
import { GetMe, getMeHandler } from './queries/get-me'

export type IdentityDeps = {
  users: UserRepository
  sessions: SessionStore
  hasher: PasswordHasher
  commands: CommandBus
  queries: QueryBus
  events: EventBus
}
export async function registerIdentityHandlers(d: IdentityDeps): Promise<void> {
  // Precompute a dummy hash once so loginHandler can run a constant-time verify() against it
  // when the login is unknown, instead of leaking account existence via response time.
  const dummyHash = await d.hasher.hash(crypto.randomUUID())
  d.commands.register(RegisterUser, registerUserHandler(d))
  d.commands.register(Login, loginHandler({ ...d, dummyHash }))
  d.commands.register(Logout, logoutHandler(d))
  d.commands.register(LogoutAll, logoutAllHandler(d))
  d.queries.register(GetMe, getMeHandler(d))
}

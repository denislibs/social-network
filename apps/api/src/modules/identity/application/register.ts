import type { Container } from '../../../kernel/di'
import { KERNEL } from '../../../kernel/tokens'
import { Login, loginHandler } from './commands/login'
import { Logout, logoutHandler } from './commands/logout'
import { LogoutAll, logoutAllHandler } from './commands/logout-all'
import { RegisterUser, registerUserHandler } from './commands/register-user'
import { IDENTITY } from './ports'
import { GetMe, getMeHandler } from './queries/get-me'

export async function registerIdentityHandlers(c: Container): Promise<void> {
  const d = {
    users: c.get(IDENTITY.UserRepository),
    usersRead: c.get(IDENTITY.UserReadModel),
    sessions: c.get(IDENTITY.SessionStore),
    hasher: c.get(IDENTITY.PasswordHasher),
    commands: c.get(KERNEL.CommandBus),
    queries: c.get(KERNEL.QueryBus),
    events: c.get(KERNEL.EventBus),
  }
  // Precompute a dummy hash once so loginHandler can run a constant-time verify() against it
  // when the login is unknown, instead of leaking account existence via response time.
  const dummyHash = await d.hasher.hash(crypto.randomUUID())
  d.commands.register(RegisterUser, registerUserHandler(d))
  d.commands.register(Login, loginHandler({ ...d, dummyHash }))
  d.commands.register(Logout, logoutHandler(d))
  d.commands.register(LogoutAll, logoutAllHandler(d))
  d.queries.register(GetMe, getMeHandler(d))
}

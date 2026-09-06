import type { Container } from '../../../kernel/di'
import { KERNEL } from '../../../kernel/tokens'
import { Login, loginHandler } from './commands/login'
import { Logout, logoutHandler } from './commands/logout'
import { LogoutAll, logoutAllHandler } from './commands/logout-all'
import { RegisterUser, registerUserHandler } from './commands/register-user'
import { UpdateProfile, updateProfileHandler } from './commands/update-profile'
import { IDENTITY } from './ports'
import { GetMe, getMeHandler } from './queries/get-me'
import { GetProfile, getProfileHandler } from './queries/get-profile'
import { SearchUsers, searchUsersHandler } from './queries/search-users'

export async function registerIdentityHandlers(c: Container): Promise<void> {
  const d = {
    users: c.get(IDENTITY.UserRepository),
    usersRead: c.get(IDENTITY.UserReadModel),
    sessions: c.get(IDENTITY.SessionStore),
    hasher: c.get(IDENTITY.PasswordHasher),
    commands: c.get(KERNEL.CommandBus),
    queries: c.get(KERNEL.QueryBus),
    events: c.get(KERNEL.EventBus),
    // Resolved lazily: social-graph's KERNEL.SocialRead binding is registered by
    // `bindSocialGraph`, which app.ts calls before this runs, but resolving it eagerly here
    // would make identity's registration order structurally depend on that — a lazy getter keeps
    // the two modules decoupled and keeps the test container free to bind it however it likes.
    social: () => c.get(KERNEL.SocialRead),
  }
  // Precompute a dummy hash once so loginHandler can run a constant-time verify() against it
  // when the login is unknown, instead of leaking account existence via response time.
  const dummyHash = await d.hasher.hash(crypto.randomUUID())
  d.commands.register(RegisterUser, registerUserHandler(d))
  d.commands.register(Login, loginHandler({ ...d, dummyHash }))
  d.commands.register(Logout, logoutHandler(d))
  d.commands.register(LogoutAll, logoutAllHandler(d))
  d.commands.register(UpdateProfile, updateProfileHandler(d))
  d.queries.register(GetMe, getMeHandler(d))
  d.queries.register(GetProfile, getProfileHandler(d))
  d.queries.register(SearchUsers, searchUsersHandler(d))
}

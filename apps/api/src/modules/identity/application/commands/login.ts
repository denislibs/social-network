import type { Command } from '../../../../kernel/command-bus'
import { UnauthorizedError } from '../../../../kernel/errors'
import type { EventBus } from '../../../../kernel/event-bus'
import { toUserDto, type UserDto } from '../dto'
import type { PasswordHasher, SessionStore, UserRepository } from '../ports'

export class Login implements Command<{ user: UserDto; token: string }> {
  declare readonly __result: { user: UserDto; token: string }
  constructor(readonly input: { login: string; password: string; ua?: string }) {}
}
export function loginHandler(d: {
  users: UserRepository
  sessions: SessionStore
  hasher: PasswordHasher
  events: EventBus
  dummyHash: string
}) {
  return async (cmd: Login) => {
    const user = await d.users.findByLogin(cmd.input.login.trim().toLowerCase())
    if (!user) {
      // Still run a hash verification against a dummy hash so an unknown login takes the same
      // time as a known one with a wrong password — otherwise response time leaks account existence.
      await d.hasher.verify(cmd.input.password, d.dummyHash)
      throw new UnauthorizedError('invalid_credentials', 'Wrong login or password')
    }
    if (!(await user.verifyPassword(cmd.input.password, d.hasher)))
      throw new UnauthorizedError('invalid_credentials', 'Wrong login or password')
    const token = await d.sessions.create(
      user.id!,
      cmd.input.ua === undefined ? {} : { ua: cmd.input.ua },
    )
    await d.events.publish([
      { type: 'UserLoggedIn', occurredAt: new Date(), payload: { userId: user.id } },
    ])
    return { user: toUserDto(user), token }
  }
}

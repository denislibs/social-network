import type { Command } from '../../../../kernel/command-bus'
import { ConflictError } from '../../../../kernel/errors'
import type { EventBus } from '../../../../kernel/event-bus'
import { User } from '../../domain/user'
import { toUserDto, type UserDto } from '../dto'
import type { PasswordHasher, SessionStore, UserRepository } from '../ports'

export class RegisterUser implements Command<{ user: UserDto; token: string }> {
  declare readonly __result: { user: UserDto; token: string }
  constructor(
    readonly input: {
      login: string
      password: string
      firstName: string
      lastName: string
      ua?: string
    },
  ) {}
}
export function registerUserHandler(d: {
  users: UserRepository
  sessions: SessionStore
  hasher: PasswordHasher
  events: EventBus
}) {
  return async (cmd: RegisterUser) => {
    const user = await User.register(cmd.input, d.hasher)
    if (await d.users.findByLogin(user.login.value))
      throw new ConflictError('login_taken', 'Login is already taken')
    const saved = await d.users.save(user)
    const token = await d.sessions.create(
      saved.id!,
      cmd.input.ua === undefined ? {} : { ua: cmd.input.ua },
    )
    await d.events.publish(saved.pullEvents())
    return { user: toUserDto(saved), token }
  }
}

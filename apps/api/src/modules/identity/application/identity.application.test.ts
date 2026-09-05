import { beforeEach, describe, expect, it } from 'bun:test'
import { CommandBus } from '../../../kernel/command-bus'
import { EventBus } from '../../../kernel/event-bus'
import { QueryBus } from '../../../kernel/query-bus'
import { Login } from './commands/login'
import { Logout } from './commands/logout'
import { LogoutAll } from './commands/logout-all'
import { RegisterUser } from './commands/register-user'
import { GetMe } from './queries/get-me'
import { registerIdentityHandlers } from './register'
import { FakeHasher, InMemorySessions, InMemoryUsers } from './testing/fakes'

let commands: CommandBus, queries: QueryBus, sessions: InMemorySessions, published: string[]
beforeEach(() => {
  commands = new CommandBus()
  queries = new QueryBus()
  sessions = new InMemorySessions()
  published = []
  const events = new EventBus()
  events.subscribe('UserRegistered', (e) => {
    published.push(`reg:${(e.payload as { userId: number }).userId}`)
  })
  registerIdentityHandlers({
    users: new InMemoryUsers(),
    sessions,
    hasher: new FakeHasher(),
    commands,
    queries,
    events,
  })
})
const input = { login: 'denis', password: 'password123', firstName: 'Денис', lastName: 'Кораблев' }

describe('identity application', () => {
  it('registers, creates session, publishes event with assigned id', async () => {
    const r = await commands.execute(new RegisterUser(input))
    expect(r.user.id).toBe(1)
    expect(await sessions.get(r.token)).toEqual({ userId: 1 })
    expect(published).toEqual(['reg:1'])
  })
  it('rejects duplicate login with 409 code', async () => {
    await commands.execute(new RegisterUser(input))
    await expect(
      commands.execute(new RegisterUser({ ...input, login: 'DENIS' })),
    ).rejects.toMatchObject({ code: 'login_taken', status: 409 })
  })
  it('logs in with right password, rejects wrong', async () => {
    await commands.execute(new RegisterUser(input))
    const r = await commands.execute(new Login({ login: 'Denis', password: 'password123' }))
    expect(r.user.login).toBe('denis')
    await expect(
      commands.execute(new Login({ login: 'denis', password: 'bad' })),
    ).rejects.toMatchObject({ code: 'invalid_credentials', status: 401 })
    await expect(
      commands.execute(new Login({ login: 'ghost', password: 'password123' })),
    ).rejects.toMatchObject({ status: 401 })
  })
  it('GetMe returns dto, 404 for unknown', async () => {
    await commands.execute(new RegisterUser(input))
    expect(await queries.ask(new GetMe(1))).toMatchObject({ id: 1, firstName: 'Денис' })
    await expect(queries.ask(new GetMe(99))).rejects.toMatchObject({ status: 404 })
  })
  it('logout deletes one session, logoutAll deletes all', async () => {
    const a = await commands.execute(new RegisterUser(input))
    const b = await commands.execute(new Login({ login: 'denis', password: 'password123' }))
    await commands.execute(new Logout(a.token))
    expect(await sessions.get(a.token)).toBeNull()
    expect(await sessions.get(b.token)).not.toBeNull()
    await commands.execute(new LogoutAll(1))
    expect(await sessions.get(b.token)).toBeNull()
  })
})

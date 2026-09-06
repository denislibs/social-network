import { beforeEach, describe, expect, it } from 'bun:test'
import type { CommandBus } from '../../../kernel/command-bus'
import { EventBus } from '../../../kernel/event-bus'
import type { QueryBus } from '../../../kernel/query-bus'
import { KERNEL } from '../../../kernel/tokens'
import { Login } from './commands/login'
import { Logout } from './commands/logout'
import { LogoutAll } from './commands/logout-all'
import { RegisterUser } from './commands/register-user'
import { IDENTITY } from './ports'
import { GetMe } from './queries/get-me'
import { registerIdentityHandlers } from './register'
import { createIdentityTestContainer } from './testing/container'
import { FakeHasher, type InMemorySessions } from './testing/fakes'

/** FakeHasher that counts calls, so tests can assert argon2-equivalent work was (not) done. */
class CountingHasher extends FakeHasher {
  hashCalls = 0
  verifyCalls = 0
  override async hash(pw: string): Promise<string> {
    this.hashCalls++
    return super.hash(pw)
  }
  override async verify(pw: string, hash: string): Promise<boolean> {
    this.verifyCalls++
    return super.verify(pw, hash)
  }
}

let commands: CommandBus, queries: QueryBus, sessions: InMemorySessions, published: string[]
beforeEach(async () => {
  published = []
  const events = new EventBus()
  events.subscribe('UserRegistered', (e) => {
    published.push(`reg:${(e.payload as { userId: number }).userId}`)
  })
  const hasher = new FakeHasher()
  const c = createIdentityTestContainer({ hasher, events })
  await registerIdentityHandlers(c)
  commands = c.get(KERNEL.CommandBus)
  queries = c.get(KERNEL.QueryBus)
  sessions = c.get(IDENTITY.SessionStore) as InMemorySessions
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
  it('rejects duplicate login before hashing the password (no argon2 DoS amplification)', async () => {
    const hasher = new CountingHasher()
    const c = createIdentityTestContainer({ hasher })
    await registerIdentityHandlers(c)
    const localCommands = c.get(KERNEL.CommandBus)
    await localCommands.execute(new RegisterUser(input))
    const hashCallsAfterFirstRegister = hasher.hashCalls
    await expect(
      localCommands.execute(new RegisterUser({ ...input, login: 'DENIS' })),
    ).rejects.toMatchObject({ code: 'login_taken', status: 409 })
    expect(hasher.hashCalls).toBe(hashCallsAfterFirstRegister)
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
  it('login with an unknown user still runs one hash verification (constant-time)', async () => {
    const hasher = new CountingHasher()
    const c = createIdentityTestContainer({ hasher })
    await registerIdentityHandlers(c)
    const localCommands = c.get(KERNEL.CommandBus)
    await expect(
      localCommands.execute(new Login({ login: 'ghost', password: 'password123' })),
    ).rejects.toMatchObject({ code: 'invalid_credentials', status: 401 })
    expect(hasher.verifyCalls).toBe(1)
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

import { beforeEach, describe, expect, it } from 'bun:test'
import type { CommandBus } from '../../../kernel/command-bus'
import { EventBus } from '../../../kernel/event-bus'
import type { QueryBus } from '../../../kernel/query-bus'
import { KERNEL } from '../../../kernel/tokens'
import { Login } from './commands/login'
import { Logout } from './commands/logout'
import { LogoutAll } from './commands/logout-all'
import { RegisterUser } from './commands/register-user'
import { UpdateProfile } from './commands/update-profile'
import { IDENTITY } from './ports'
import { GetMe } from './queries/get-me'
import { GetProfile } from './queries/get-profile'
import { SearchUsers } from './queries/search-users'
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

  describe('UpdateProfile', () => {
    it('sets fields (trimming status/bio) and returns a ProfileDto with self relation/counters', async () => {
      await commands.execute(new RegisterUser(input))
      const dto = await commands.execute(
        new UpdateProfile({
          me: 1,
          status: '  Hello there  ',
          bio: ' About me ',
          city: 'Москва',
          birthday: '1990-05-15',
          screenName: 'denis1',
        }),
      )
      expect(dto).toMatchObject({
        id: 1,
        status: 'Hello there',
        bio: 'About me',
        city: 'Москва',
        birthday: '1990-05-15',
        screenName: 'denis1',
        isVerified: false,
        relation: 'self',
        login: 'denis',
        counters: { friends: 0, followers: 0, communities: 0, incomingRequests: 0 },
      })
    })
    it('applies only patched fields and clears a field set to null', async () => {
      await commands.execute(new RegisterUser(input))
      await commands.execute(new UpdateProfile({ me: 1, status: 'first', city: 'Казань' }))
      const dto = await commands.execute(new UpdateProfile({ me: 1, status: null }))
      expect(dto).toMatchObject({ status: null, city: 'Казань' })
    })
    it('rejects a status over 140 chars', async () => {
      await commands.execute(new RegisterUser(input))
      await expect(
        commands.execute(new UpdateProfile({ me: 1, status: 'x'.repeat(141) })),
      ).rejects.toMatchObject({ code: 'status_too_long', status: 422 })
    })
    it('rejects a bio over 2000 chars', async () => {
      await commands.execute(new RegisterUser(input))
      await expect(
        commands.execute(new UpdateProfile({ me: 1, bio: 'x'.repeat(2001) })),
      ).rejects.toMatchObject({ code: 'bio_too_long', status: 422 })
    })
    it('rejects a city not in CITIES', async () => {
      await commands.execute(new RegisterUser(input))
      await expect(
        commands.execute(new UpdateProfile({ me: 1, city: 'Атлантида' })),
      ).rejects.toMatchObject({ code: 'invalid_city', status: 422 })
    })
    it('rejects an invalid/future/too-old birthday', async () => {
      await commands.execute(new RegisterUser(input))
      for (const bad of ['not-a-date', '2020-02-30', '1899-12-31', '2999-01-01'])
        await expect(
          commands.execute(new UpdateProfile({ me: 1, birthday: bad })),
        ).rejects.toMatchObject({ code: 'invalid_birthday', status: 422 })
    })
    it('rejects a reserved screen name', async () => {
      await commands.execute(new RegisterUser(input))
      await expect(
        commands.execute(new UpdateProfile({ me: 1, screenName: 'feed' })),
      ).rejects.toMatchObject({ code: 'screen_name_reserved', status: 422 })
    })
  })

  describe('GetProfile', () => {
    it('resolves by id, by screen name, relation comes from the social port, 404 for unknown', async () => {
      await commands.execute(new RegisterUser(input))
      const self = await queries.ask(new GetProfile('id1', 1))
      expect(self).toMatchObject({ id: 1, relation: 'self' })
      const asOther = await queries.ask(new GetProfile('id1', 2))
      expect(asOther.relation).toBe('none')
      await commands.execute(new UpdateProfile({ me: 1, screenName: 'denis1' }))
      const byScreen = await queries.ask(new GetProfile('denis1', null))
      expect(byScreen.id).toBe(1)
      await expect(queries.ask(new GetProfile('id999', null))).rejects.toMatchObject({
        code: 'user_not_found',
        status: 404,
      })
    })
    it('exposes `login` only to the profile owner', async () => {
      await commands.execute(new RegisterUser(input))
      expect(await queries.ask(new GetProfile('id1', 1))).toMatchObject({ login: 'denis' })
      expect(await queries.ask(new GetProfile('id1', 2))).not.toHaveProperty('login')
      expect(await queries.ask(new GetProfile('id1', null))).not.toHaveProperty('login')
    })
  })

  describe('SearchUsers', () => {
    it('matches by name/screen-name prefix via the in-memory read model', async () => {
      await commands.execute(new RegisterUser(input))
      await commands.execute(
        new RegisterUser({ ...input, login: 'anna', firstName: 'Анна', lastName: 'Иванова' }),
      )
      const results = await queries.ask(new SearchUsers('ден'))
      expect(results.map((r) => r.firstName)).toEqual(['Денис'])
    })
  })
})

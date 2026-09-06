import { Elysia, t } from 'elysia'
import type { Container } from '../../../kernel/di'
import { KERNEL } from '../../../kernel/tokens'
import { Login } from '../application/commands/login'
import { Logout } from '../application/commands/logout'
import { LogoutAll } from '../application/commands/logout-all'
import { RegisterUser } from '../application/commands/register-user'
import { IDENTITY } from '../application/ports'
import { GetMe } from '../application/queries/get-me'
import { authPlugin } from './auth-macro'

const SESSION_MAX_AGE = 30 * 86400
const sessionCookie = t.Cookie({ sid: t.Optional(t.String()) })
const userSchema = t.Object({
  id: t.Number(),
  login: t.String(),
  firstName: t.String(),
  lastName: t.String(),
  screenName: t.Nullable(t.String()),
  createdAt: t.String(),
})

export function identityRoutes(c: Container) {
  const d = {
    commands: c.get(KERNEL.CommandBus),
    queries: c.get(KERNEL.QueryBus),
    sessions: c.get(IDENTITY.SessionStore),
    cookieSecure: c.get(KERNEL.Config).cookieSecure,
  }
  const setSession = (cookie: { sid: { set(o: object): unknown } }, token: string) => {
    cookie.sid.set({
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
      secure: d.cookieSecure,
    })
  }

  return new Elysia()
    .use(authPlugin(d.sessions))
    .group('/auth', (app) =>
      app
        .post(
          '/register',
          async ({ body, cookie, set, headers }) => {
            const ua = headers['user-agent']
            const r = await d.commands.execute(
              new RegisterUser(ua === undefined ? body : { ...body, ua }),
            )
            setSession(cookie, r.token)
            set.status = 201
            return { user: r.user }
          },
          {
            body: t.Object({
              login: t.String(),
              password: t.String(),
              firstName: t.String(),
              lastName: t.String(),
            }),
            cookie: sessionCookie,
            response: { 201: t.Object({ user: userSchema }) },
          },
        )
        .post(
          '/login',
          async ({ body, cookie, headers }) => {
            const ua = headers['user-agent']
            const r = await d.commands.execute(new Login(ua === undefined ? body : { ...body, ua }))
            setSession(cookie, r.token)
            return { user: r.user }
          },
          {
            body: t.Object({ login: t.String(), password: t.String() }),
            cookie: sessionCookie,
            response: { 200: t.Object({ user: userSchema }) },
          },
        )
        .post(
          '/logout',
          async ({ cookie, set, sessionToken }) => {
            await d.commands.execute(new Logout(sessionToken))
            cookie.sid.remove()
            set.status = 204
          },
          { auth: true },
        )
        .post(
          '/logout-all',
          async ({ cookie, set, user }) => {
            await d.commands.execute(new LogoutAll(user.id))
            cookie.sid.remove()
            set.status = 204
          },
          { auth: true },
        ),
    )
    .get('/me', async ({ user }) => ({ user: await d.queries.ask(new GetMe(user.id)) }), {
      auth: true,
      response: { 200: t.Object({ user: userSchema }) },
    })
}

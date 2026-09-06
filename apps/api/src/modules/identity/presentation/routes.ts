import { Elysia, t } from 'elysia'
import type { Container } from '../../../kernel/di'
import { authPlugin } from '../../../kernel/http/auth-plugin'
import { KERNEL } from '../../../kernel/tokens'
import { Login } from '../application/commands/login'
import { Logout } from '../application/commands/logout'
import { LogoutAll } from '../application/commands/logout-all'
import { RegisterUser } from '../application/commands/register-user'
import { UpdateProfile } from '../application/commands/update-profile'
import { GetMe } from '../application/queries/get-me'
import { GetProfile } from '../application/queries/get-profile'

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
const relationSchema = t.UnionEnum(['none', 'outgoing', 'incoming', 'friends', 'self'])
const countersSchema = t.Object({
  friends: t.Number(),
  followers: t.Number(),
  communities: t.Number(),
  incomingRequests: t.Number(),
})
const profileSchema = t.Object({
  id: t.Number(),
  login: t.String(),
  firstName: t.String(),
  lastName: t.String(),
  screenName: t.Nullable(t.String()),
  createdAt: t.String(),
  status: t.Nullable(t.String()),
  bio: t.Nullable(t.String()),
  city: t.Nullable(t.String()),
  birthday: t.Nullable(t.String()),
  isVerified: t.Boolean(),
  counters: countersSchema,
  relation: relationSchema,
})

export function identityRoutes(c: Container) {
  const d = {
    commands: c.get(KERNEL.CommandBus),
    queries: c.get(KERNEL.QueryBus),
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
    .use(authPlugin(c.get(KERNEL.SessionResolver)))
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
    .get(
      '/users/:id',
      async ({ params, viewer }) => ({
        user: await d.queries.ask(new GetProfile(params.id, viewer?.id ?? null)),
      }),
      {
        optionalAuth: true,
        // Named `id` (not `idOrScreen`) so the router's radix tree can share this path segment
        // with social-graph's `/users/:id/friends` etc. — memoirist requires the same param name
        // at a shared tree position across every route mounted into the app, even though this
        // route accepts either a numeric id or a screen name here (see `GetProfile`/`idOrScreen`
        // parsing) while the others require a numeric id.
        params: t.Object({ id: t.String() }),
        response: { 200: t.Object({ user: profileSchema }) },
      },
    )
    .patch(
      '/me/profile',
      async ({ body, user }) => ({
        user: await d.commands.execute(new UpdateProfile({ me: user.id, ...body })),
      }),
      {
        auth: true,
        body: t.Object({
          status: t.Optional(t.Nullable(t.String())),
          bio: t.Optional(t.Nullable(t.String())),
          city: t.Optional(t.Nullable(t.String())),
          birthday: t.Optional(t.Nullable(t.String())),
          screenName: t.Optional(t.Nullable(t.String())),
        }),
        response: { 200: t.Object({ user: profileSchema }) },
      },
    )
}

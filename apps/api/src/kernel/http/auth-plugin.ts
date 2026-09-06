import { Elysia, t } from 'elysia'
import { UnauthorizedError } from '../errors'
import type { SessionResolver } from '../tokens'

const sessionCookie = t.Cookie({ sid: t.Optional(t.String()) })

export function authPlugin(sessions: SessionResolver) {
  return new Elysia({ name: 'auth' })
    .macro('auth', {
      cookie: sessionCookie,
      async resolve({ cookie }) {
        const token = cookie.sid?.value
        if (!token) throw new UnauthorizedError()
        const session = await sessions.get(token)
        if (!session) throw new UnauthorizedError()
        await sessions.touch(token)
        return { user: { id: session.userId }, sessionToken: token }
      },
    })
    .macro('optionalAuth', {
      cookie: sessionCookie,
      async resolve({ cookie }) {
        const token = cookie.sid?.value
        const session = token ? await sessions.get(token) : null
        return { viewer: session ? { id: session.userId } : null }
      },
    })
}

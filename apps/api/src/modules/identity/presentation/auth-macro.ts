import { Elysia, t } from 'elysia'
import { UnauthorizedError } from '../../../kernel/errors'
import type { SessionStore } from '../application/ports'

export function authPlugin(sessions: SessionStore) {
  return new Elysia({ name: 'auth' }).macro('auth', {
    cookie: t.Cookie({ sid: t.Optional(t.String()) }),
    async resolve({ cookie }) {
      const token = cookie.sid?.value
      if (!token) throw new UnauthorizedError()
      const session = await sessions.get(token)
      if (!session) throw new UnauthorizedError()
      await sessions.touch(token)
      return { user: { id: session.userId }, sessionToken: token }
    },
  })
}

import { NOTIFICATION_KINDS } from '@vkc/contracts'
import { Elysia, t } from 'elysia'
import type { Container } from '../../../kernel/di'
import { authPlugin } from '../../../kernel/http/auth-plugin'
import { KERNEL } from '../../../kernel/tokens'
import { MarkNotificationsRead } from '../application/commands/mark-read'
import { GetNotifications } from '../application/queries/get-notifications'
import { GetUnreadCount } from '../application/queries/get-unread-count'

const userCellSchema = t.Object({
  id: t.Number(),
  firstName: t.String(),
  lastName: t.String(),
  screenName: t.Nullable(t.String()),
  city: t.Nullable(t.String()),
  isVerified: t.Boolean(),
  lastSeenAt: t.Nullable(t.String()),
})
const notificationSchema = t.Object({
  id: t.Number(),
  kind: t.UnionEnum(NOTIFICATION_KINDS),
  createdAt: t.String(),
  readAt: t.Nullable(t.String()),
  actor: t.Nullable(userCellSchema),
  payload: t.Record(t.String(), t.Unknown()),
})

export function notificationsRoutes(c: Container) {
  const d = {
    commands: c.get(KERNEL.CommandBus),
    queries: c.get(KERNEL.QueryBus),
  }

  return new Elysia()
    .use(authPlugin(c.get(KERNEL.SessionResolver)))
    .get(
      '/me/notifications',
      ({ query, user }) => d.queries.ask(new GetNotifications(user.id, query.cursor)),
      {
        auth: true,
        query: t.Object({ cursor: t.Optional(t.String()) }),
        response: {
          200: t.Object({ items: t.Array(notificationSchema), nextCursor: t.Nullable(t.String()) }),
        },
      },
    )
    .get(
      '/me/notifications/unread-count',
      ({ user }) => d.queries.ask(new GetUnreadCount(user.id)),
      {
        auth: true,
        response: { 200: t.Object({ count: t.Number() }) },
      },
    )
    .post(
      '/me/notifications/read',
      ({ body, user }) =>
        d.commands.execute(new MarkNotificationsRead({ me: user.id, uptoId: body.uptoId })),
      {
        auth: true,
        body: t.Object({ uptoId: t.Number() }),
        response: { 200: t.Object({ count: t.Number() }) },
      },
    )
}

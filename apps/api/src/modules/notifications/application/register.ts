import type { Container } from '../../../kernel/di'
import { KERNEL } from '../../../kernel/tokens'
import { MarkNotificationsRead, markNotificationsReadHandler } from './commands/mark-read'
import { NOTIFICATIONS } from './ports'
import { GetNotifications, getNotificationsHandler } from './queries/get-notifications'
import { GetUnreadCount, getUnreadCountHandler } from './queries/get-unread-count'

export async function registerNotificationsHandlers(c: Container): Promise<void> {
  const d = {
    repo: c.get(NOTIFICATIONS.Repository),
    read: c.get(NOTIFICATIONS.ReadModel),
  }
  const commands = c.get(KERNEL.CommandBus)
  const queries = c.get(KERNEL.QueryBus)

  commands.register(MarkNotificationsRead, markNotificationsReadHandler(d))

  queries.register(GetUnreadCount, getUnreadCountHandler(d))
  queries.register(GetNotifications, getNotificationsHandler(d))
}

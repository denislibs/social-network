import type { Command } from '../../../../kernel/command-bus'
import type { NotificationReadModel, NotificationRepository } from '../ports'

export class MarkNotificationsRead implements Command<{ count: number }> {
  declare readonly __result: { count: number }
  constructor(readonly input: { me: number; uptoId: number }) {}
}

export const markNotificationsReadHandler =
  (d: { repo: NotificationRepository; read: NotificationReadModel }) =>
  async (cmd: MarkNotificationsRead): Promise<{ count: number }> => {
    const { me, uptoId } = cmd.input
    await d.repo.markRead(me, uptoId)
    return { count: await d.read.unreadCount(me) }
  }

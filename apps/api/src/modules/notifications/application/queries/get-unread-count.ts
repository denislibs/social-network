import type { Query } from '../../../../kernel/query-bus'
import type { NotificationReadModel } from '../ports'

export class GetUnreadCount implements Query<{ count: number }> {
  declare readonly __result: { count: number }
  constructor(readonly userId: number) {}
}

export const getUnreadCountHandler =
  (d: { read: NotificationReadModel }) =>
  async (q: GetUnreadCount): Promise<{ count: number }> => ({
    count: await d.read.unreadCount(q.userId),
  })

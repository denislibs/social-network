import type { Query } from '../../../../kernel/query-bus'
import type { NotificationDto, Page } from '../dto'
import type { NotificationReadModel } from '../ports'

export class GetNotifications implements Query<Page<NotificationDto>> {
  declare readonly __result: Page<NotificationDto>
  constructor(
    readonly me: number,
    readonly cursor?: string,
  ) {}
}

export const getNotificationsHandler =
  (d: { read: NotificationReadModel }) =>
  async (q: GetNotifications): Promise<Page<NotificationDto>> =>
    d.read.list(q.me, q.cursor ?? null)

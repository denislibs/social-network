import { type ApiClient, type UnauthorizedBus, unwrap } from '@/shared/api'
import type { NotificationGateway } from '../model/ports'
import type { NotificationDto, Page } from '../model/types'

export class EdenNotificationGateway implements NotificationGateway {
  constructor(
    private readonly api: ApiClient,
    private readonly bus: UnauthorizedBus,
  ) {}

  async unreadCount(): Promise<number> {
    return unwrap(await this.api.api.v1.me.notifications['unread-count'].get(), {
      bus: this.bus,
    }).count
  }

  async list(cursor: string | null): Promise<Page<NotificationDto>> {
    return unwrap(await this.api.api.v1.me.notifications.get({ query: cursor ? { cursor } : {} }), {
      bus: this.bus,
    })
  }

  async markRead(uptoId: number): Promise<number> {
    return unwrap(await this.api.api.v1.me.notifications.read.post({ uptoId }), {
      bus: this.bus,
    }).count
  }
}

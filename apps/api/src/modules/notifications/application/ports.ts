import type { NotificationKind } from '../../../db/schema'
import { token } from '../../../kernel/di'
import type { NotificationDto, Page } from './dto'

export interface NotificationRepository {
  insert(
    rows: {
      userId: number
      kind: NotificationKind
      actorId: number | null
      groupKey?: string | null
      payload?: Record<string, unknown>
    }[],
  ): Promise<void>
  markRead(userId: number, uptoId: number): Promise<void>
}

export interface NotificationReadModel {
  unreadCount(userId: number): Promise<number>
  list(userId: number, cursor: string | null): Promise<Page<NotificationDto>>
}

export const NOTIFICATIONS = {
  Repository: token<NotificationRepository>('NotificationRepository'),
  ReadModel: token<NotificationReadModel>('NotificationReadModel'),
}

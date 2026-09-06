import type { ServiceIdentifier } from '@/shared/di'
import type { NotificationDto, Page } from './types'

export interface NotificationGateway {
  unreadCount(): Promise<number>
  list(cursor: string | null): Promise<Page<NotificationDto>>
  markRead(uptoId: number): Promise<number>
}

export const NOTIFICATION_GATEWAY: ServiceIdentifier<NotificationGateway> =
  Symbol('NotificationGateway')

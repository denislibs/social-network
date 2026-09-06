import type { Container } from '../../../kernel/di'
import { KERNEL } from '../../../kernel/tokens'
import { NOTIFICATIONS } from '../application/ports'
import { DrizzleNotificationReadModel } from './drizzle-notification-read-model'
import { DrizzleNotificationRepository } from './drizzle-notification-repository'

/** Scope defaults to Singleton — set by `createKernelContainer` (`kernel/container.ts`). */
export function bindNotificationsInfrastructure(c: Container): void {
  c.bind(NOTIFICATIONS.Repository).toResolvedValue(
    (db) => new DrizzleNotificationRepository(db),
    [KERNEL.Db],
  )
  c.bind(NOTIFICATIONS.ReadModel).toResolvedValue(
    (db) => new DrizzleNotificationReadModel(db),
    [KERNEL.Db],
  )
}

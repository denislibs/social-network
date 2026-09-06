import type { Container } from '../../kernel/di'
import { KERNEL } from '../../kernel/tokens'
import { NOTIFICATIONS } from './application/ports'
import { registerNotificationsHandlers } from './application/register'
import { subscribeGraphNotifications } from './application/subscribers/graph-subscriber'
import { bindNotificationsInfrastructure } from './infrastructure/notifications.container'
import { notificationsRoutes } from './presentation/routes'

export function bindNotifications(c: Container): void {
  bindNotificationsInfrastructure(c)
}

/**
 * Registers the command/query handlers, subscribes the graph-event subscriber to the shared
 * event bus, and returns the routes plugin. Must run exactly once per app (subscribing twice
 * would double-insert a notification per published event).
 */
export async function mountNotifications(c: Container) {
  await registerNotificationsHandlers(c)
  subscribeGraphNotifications(c.get(KERNEL.EventBus), c.get(NOTIFICATIONS.Repository))
  return notificationsRoutes(c)
}

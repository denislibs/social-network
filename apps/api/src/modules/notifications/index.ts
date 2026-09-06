import type { Container } from '../../kernel/di'
import { KERNEL } from '../../kernel/tokens'
import { NOTIFICATIONS } from './application/ports'
import { registerNotificationsHandlers } from './application/register'
import { subscribeGraphNotifications } from './application/subscribers/graph-subscriber'
import { bindNotificationsInfrastructure } from './infrastructure/notifications.container'

export function bindNotifications(c: Container): void {
  bindNotificationsInfrastructure(c)
}

/**
 * Routes come in Task 8 — for now this registers the command/query handlers and subscribes the
 * graph-event subscriber to the shared event bus. Must run exactly once per app (subscribing
 * twice would double-insert a notification per published event).
 */
export async function mountNotifications(c: Container): Promise<null> {
  await registerNotificationsHandlers(c)
  subscribeGraphNotifications(c.get(KERNEL.EventBus), c.get(NOTIFICATIONS.Repository))
  return null
}

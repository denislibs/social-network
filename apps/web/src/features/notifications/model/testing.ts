import {
  fakeNotificationGateway,
  NOTIFICATION_GATEWAY,
  type NotificationGateway,
} from '@/entities/notification'
import { createTestContainer } from '@/shared/di'
import { fakeTabCoordinator, TAB_COORDINATOR, type TabCoordinator } from '@/shared/lib'

/** Re-exported so existing relative imports inside this slice (`from './testing'`) keep working;
 * the canonical implementations now live in `entities/notification` and `shared/lib/tabs`. */
export { fakeNotificationGateway, fakeTabCoordinator }

export function notificationsTestContainer(
  gateway: NotificationGateway,
  coordinator: TabCoordinator = fakeTabCoordinator(),
) {
  const c = createTestContainer()
  c.bind(NOTIFICATION_GATEWAY).toConstantValue(gateway)
  c.bind(TAB_COORDINATOR).toConstantValue(coordinator)
  return c
}

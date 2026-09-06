import { useSession } from '@/entities/session'
import { useNotificationSync } from '@/features/notifications'

/** Actually runs the sync side effects. Split out so `useNotificationSync` (which must run
 * unconditionally, per the rules of hooks) is only ever mounted while authed. */
function NotificationSyncActive() {
  useNotificationSync()
  return null
}

/** Mounted once in `app/main.tsx`, inside `SessionProvider`: renders nothing, and while authed
 * keeps this tab's notification cache, cross-tab broadcast, and document title in sync (see
 * `useNotificationSync`). Guarded here — via `useSession()`, not inside the hook itself — so
 * a signed-out tab never opens the cross-tab channel or polls for a count that isn't its own. */
export function NotificationSync() {
  const { status } = useSession()
  return status === 'authed' ? <NotificationSyncActive /> : null
}

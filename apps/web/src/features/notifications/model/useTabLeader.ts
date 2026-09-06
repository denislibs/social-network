import { useSyncExternalStore } from 'react'
import { useService } from '@/shared/di'
import { TAB_COORDINATOR } from '@/shared/lib'

/** Whether this browser tab currently holds cross-tab "leader" status (see `TabCoordinator`). */
export function useTabLeader(): boolean {
  const coordinator = useService(TAB_COORDINATOR)
  return useSyncExternalStore(coordinator.onLeaderChange, coordinator.isLeader)
}

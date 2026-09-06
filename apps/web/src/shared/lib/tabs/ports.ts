import type { ServiceIdentifier } from '@/shared/di'

export type TabMessage =
  | { type: 'notifications:changed'; unread: number }
  | { type: 'notifications:read'; uptoId: number }
  | { type: 'tab:active'; tabId: string; active: boolean }

export interface TabCoordinator {
  readonly tabId: string
  isLeader(): boolean
  onLeaderChange(cb: (leader: boolean) => void): () => void
  isActive(): boolean
  onActiveChange(cb: (active: boolean) => void): () => void
  broadcast(msg: TabMessage): void
  subscribe(cb: (msg: TabMessage) => void): () => void
}

export const TAB_COORDINATOR: ServiceIdentifier<TabCoordinator> = Symbol('TabCoordinator')

import type { ServiceIdentifier } from '@/shared/di'

export type TabMessage =
  | { type: 'notifications:changed'; unread: number }
  | { type: 'notifications:read'; uptoId: number }
  | { type: 'tab:active'; tabId: string; active: boolean }

export interface TabCoordinator {
  readonly tabId: string
  /**
   * Whether this tab may take part in leader election at all. A tab starts **ineligible** and
   * only signals otherwise once it has something to lead for — in this app, `useNotificationSync`
   * flips it on while the session is authed and off again on logout or unmount. Without it a
   * signed-out tab would grab the lock at startup and hold it forever, leaving the authed tab
   * next to it permanently follower-only and never polling.
   */
  setEligible(eligible: boolean): void
  isLeader(): boolean
  onLeaderChange(cb: (leader: boolean) => void): () => void
  isActive(): boolean
  onActiveChange(cb: (active: boolean) => void): () => void
  broadcast(msg: TabMessage): void
  subscribe(cb: (msg: TabMessage) => void): () => void
}

export const TAB_COORDINATOR: ServiceIdentifier<TabCoordinator> = Symbol('TabCoordinator')

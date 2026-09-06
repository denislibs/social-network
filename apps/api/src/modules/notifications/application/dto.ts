import type { NotificationKind } from '@vkc/contracts'

/**
 * Copied from social-graph's `application/dto.ts` (module boundaries forbid importing another
 * module's inner layers). Task 8 unifies both into `apps/api/src/modules/dto.ts`, the single
 * export surface `@vkc/contracts` re-exports from.
 */
export type UserCellDto = {
  id: number
  firstName: string
  lastName: string
  screenName: string | null
  city: string | null
  isVerified: boolean
  lastSeenAt: string | null
}
export type Page<T> = { items: T[]; nextCursor: string | null }
export type NotificationDto = {
  id: number
  kind: NotificationKind
  createdAt: string
  readAt: string | null
  actor: UserCellDto | null
  payload: Record<string, unknown>
}

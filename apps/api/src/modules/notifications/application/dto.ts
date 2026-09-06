import type { NotificationKind } from '../../../db/schema'

/** Copied from social-graph's `application/dto.ts` — Task 8 unifies the two exports. */
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

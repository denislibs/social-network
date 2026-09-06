import { treaty } from '@elysia/eden'
import type { App } from '@vkc/api/app'

export type {
  CommunityCellDto,
  CommunityDto,
  Counters,
  HandleDto,
  Membership,
  NotificationDto,
  Page,
  ProfileDto,
  Relation,
  SuggestionDto,
  UserCellDto,
  UserDto,
} from '@vkc/api/dto'
export { CITIES } from './cities'
export type { NotificationKind } from './notification-kinds'
export { NOTIFICATION_KINDS } from './notification-kinds'
export type { Topic } from './topics'
export { TOPICS } from './topics'
export type { App }
export function createApi(baseUrl: string, fetchInit: RequestInit = {}) {
  return treaty<App>(baseUrl, { fetch: { credentials: 'include', ...fetchInit } })
}
export type Api = ReturnType<typeof createApi>

import type { NotificationKind } from '@vkc/contracts'
import type { Counters, Relation } from '../kernel/social-read'
import type { ProfileDto, UserDto } from './identity/application/dto'
import type { NotificationDto } from './notifications/application/dto'
import type {
  CommunityCellDto,
  CommunityDto,
  HandleDto,
  Membership,
  Page,
  SuggestionDto,
  UserCellDto,
} from './social-graph/application/dto'

/**
 * Single public export surface for every module's DTO types, re-exported (types only, so no
 * runtime import cycle) from `@vkc/contracts` for the web app. Each type still lives in its
 * owning module's `application/dto.ts` — this file just gathers them; it sits outside every
 * module directory (no `<module>/<layer>/` path), so `boundaries.test.ts`'s cross-module-inner-
 * layer check does not apply to it.
 */
export type {
  CommunityCellDto,
  CommunityDto,
  Counters,
  HandleDto,
  Membership,
  NotificationDto,
  NotificationKind,
  Page,
  ProfileDto,
  Relation,
  SuggestionDto,
  UserCellDto,
  UserDto,
}

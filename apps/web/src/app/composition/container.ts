import { COMMUNITY_GATEWAY, EdenCommunityGateway } from '@/entities/community'
import { EdenNotificationGateway, NOTIFICATION_GATEWAY } from '@/entities/notification'
import { EdenSessionGateway, SESSION_GATEWAY } from '@/entities/session'
import { EdenUserGateway, USER_GATEWAY } from '@/entities/user'
import { AUTH_GATEWAY, EdenAuthGateway } from '@/features/auth'
import { EdenFriendshipGateway, FRIENDSHIP_GATEWAY } from '@/features/friendship'
import { EdenSuggestionsGateway, SUGGESTIONS_GATEWAY } from '@/features/suggestions'
import { API_CLIENT, createApi, UNAUTHORIZED_BUS, UnauthorizedBus } from '@/shared/api'
import { APP_ORIGIN, STORAGE_KEYS } from '@/shared/config'
import { type Container, createContainer } from '@/shared/di'
import {
  COLOR_SCHEME_STORE,
  ColorSchemeStore,
  createBrowserPrefStorage,
  createBrowserSystemScheme,
  createBrowserTabCoordinator,
  PREF_STORAGE,
  SYSTEM_SCHEME,
  TAB_COORDINATOR,
} from '@/shared/lib'

/** Composition root: the only place that binds real (side-effectful) implementations. */
export function createAppContainer(): Container {
  const container = createContainer()

  container.bind(API_CLIENT).toConstantValue(createApi(APP_ORIGIN))
  container.bind(UNAUTHORIZED_BUS).toConstantValue(new UnauthorizedBus())

  container
    .bind(AUTH_GATEWAY)
    .toResolvedValue((api, bus) => new EdenAuthGateway(api, bus), [API_CLIENT, UNAUTHORIZED_BUS])
  container
    .bind(SESSION_GATEWAY)
    .toResolvedValue((api) => new EdenSessionGateway(api), [API_CLIENT])
  container
    .bind(USER_GATEWAY)
    .toResolvedValue((api, bus) => new EdenUserGateway(api, bus), [API_CLIENT, UNAUTHORIZED_BUS])
  container
    .bind(COMMUNITY_GATEWAY)
    .toResolvedValue(
      (api, bus) => new EdenCommunityGateway(api, bus),
      [API_CLIENT, UNAUTHORIZED_BUS],
    )
  container
    .bind(NOTIFICATION_GATEWAY)
    .toResolvedValue(
      (api, bus) => new EdenNotificationGateway(api, bus),
      [API_CLIENT, UNAUTHORIZED_BUS],
    )
  container
    .bind(FRIENDSHIP_GATEWAY)
    .toResolvedValue(
      (api, bus) => new EdenFriendshipGateway(api, bus),
      [API_CLIENT, UNAUTHORIZED_BUS],
    )
  container
    .bind(SUGGESTIONS_GATEWAY)
    .toResolvedValue(
      (api, bus) => new EdenSuggestionsGateway(api, bus),
      [API_CLIENT, UNAUTHORIZED_BUS],
    )

  container.bind(TAB_COORDINATOR).toConstantValue(createBrowserTabCoordinator())

  container.bind(PREF_STORAGE).toConstantValue(createBrowserPrefStorage(STORAGE_KEYS.colorScheme))
  container.bind(SYSTEM_SCHEME).toConstantValue(createBrowserSystemScheme())
  container
    .bind(COLOR_SCHEME_STORE)
    .toResolvedValue((s, m) => new ColorSchemeStore(s, m), [PREF_STORAGE, SYSTEM_SCHEME])

  return container
}

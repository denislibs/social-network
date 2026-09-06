import { EdenSessionGateway, SESSION_GATEWAY } from '@/entities/session'
import { AUTH_GATEWAY, EdenAuthGateway } from '@/features/auth'
import {
  API_CLIENT,
  type ApiClient,
  createApi,
  UNAUTHORIZED_BUS,
  UnauthorizedBus,
} from '@/shared/api'
import { APP_ORIGIN, STORAGE_KEYS } from '@/shared/config'
import { type Container, createContainer } from '@/shared/di'
import {
  COLOR_SCHEME_STORE,
  ColorSchemeStore,
  createBrowserPrefStorage,
  createBrowserSystemScheme,
  PREF_STORAGE,
  SYSTEM_SCHEME,
} from '@/shared/lib'

/** Composition root: the only place that binds real (side-effectful) implementations. */
export function createAppContainer(): Container {
  const container = createContainer()

  container.bind(API_CLIENT).toConstantValue(createApi(APP_ORIGIN) as ApiClient)
  container.bind(UNAUTHORIZED_BUS).toConstantValue(new UnauthorizedBus())

  container
    .bind(AUTH_GATEWAY)
    .toResolvedValue((api, bus) => new EdenAuthGateway(api, bus), [API_CLIENT, UNAUTHORIZED_BUS])
  container
    .bind(SESSION_GATEWAY)
    .toResolvedValue((api, bus) => new EdenSessionGateway(api, bus), [API_CLIENT, UNAUTHORIZED_BUS])

  container.bind(PREF_STORAGE).toConstantValue(createBrowserPrefStorage(STORAGE_KEYS.colorScheme))
  container.bind(SYSTEM_SCHEME).toConstantValue(createBrowserSystemScheme())
  container
    .bind(COLOR_SCHEME_STORE)
    .toResolvedValue((s, m) => new ColorSchemeStore(s, m), [PREF_STORAGE, SYSTEM_SCHEME])

  return container
}

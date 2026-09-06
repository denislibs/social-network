import type { Container } from '../../kernel/di'
import { registerIdentityHandlers } from './application/register'
import { bindIdentityInfrastructure } from './infrastructure/identity.container'
import { identityRoutes } from './presentation/routes'

/**
 * Re-exported for social-graph's `GET /search` route: it asks the `QueryBus` for `SearchUsers`
 * alongside its own `SearchCommunities`, and importing another module's public `index.ts` (as
 * opposed to reaching into its `application/`) is allowed by `modules/boundaries.test.ts`.
 */
export { SearchUsers } from './application/queries/search-users'

export function bindIdentity(c: Container): void {
  bindIdentityInfrastructure(c)
}

export async function mountIdentity(c: Container) {
  await registerIdentityHandlers(c)
  return identityRoutes(c)
}

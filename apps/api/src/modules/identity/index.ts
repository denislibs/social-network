import type { Container } from '../../kernel/di'
import { registerIdentityHandlers } from './application/register'
import { bindIdentityInfrastructure } from './infrastructure/identity.container'
import { identityRoutes } from './presentation/routes'

export async function identityModule(c: Container) {
  bindIdentityInfrastructure(c)
  await registerIdentityHandlers(c)
  return { plugin: identityRoutes(c) }
}

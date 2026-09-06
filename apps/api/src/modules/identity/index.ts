import type { Container } from '../../kernel/di'
import { registerIdentityHandlers } from './application/register'
import { bindIdentityInfrastructure } from './infrastructure/identity.container'
import { identityRoutes } from './presentation/routes'

export function bindIdentity(c: Container): void {
  bindIdentityInfrastructure(c)
}

export async function mountIdentity(c: Container) {
  await registerIdentityHandlers(c)
  return identityRoutes(c)
}

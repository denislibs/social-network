import type { Container } from '../../kernel/di'
import { registerSocialGraphHandlers } from './application/register'
import { bindSocialGraphInfrastructure } from './infrastructure/social-graph.container'
import { socialGraphRoutes } from './presentation/routes'

export function bindSocialGraph(c: Container): void {
  bindSocialGraphInfrastructure(c)
}

export async function mountSocialGraph(c: Container) {
  await registerSocialGraphHandlers(c)
  return socialGraphRoutes(c)
}

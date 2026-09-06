import type { Container } from '../../kernel/di'
import { registerSocialGraphHandlers } from './application/register'
import { bindSocialGraphInfrastructure } from './infrastructure/social-graph.container'

export function bindSocialGraph(c: Container): void {
  bindSocialGraphInfrastructure(c)
}

/** Routes come in Task 8 — for now this only wires the command/query handlers into the buses. */
export async function mountSocialGraph(c: Container): Promise<null> {
  await registerSocialGraphHandlers(c)
  return null
}

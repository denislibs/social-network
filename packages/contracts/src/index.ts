import { treaty } from '@elysia/eden'
import type { App } from '@vkc/api/app'

export type { UserDto } from '@vkc/api/dto'
export { CITIES } from './cities'
export type { Topic } from './topics'
export { TOPICS } from './topics'
export type { App }
export function createApi(baseUrl: string, fetchInit: RequestInit = {}) {
  return treaty<App>(baseUrl, { fetch: { credentials: 'include', ...fetchInit } })
}
export type Api = ReturnType<typeof createApi>

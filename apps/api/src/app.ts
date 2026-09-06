import { Elysia } from 'elysia'
import { createKernelContainer } from './kernel/container'
import type { AppDeps } from './kernel/deps'
import { AppError } from './kernel/errors'
import { bindIdentity, mountIdentity } from './modules/identity'
import { bindNotifications, mountNotifications } from './modules/notifications'
import { bindSocialGraph, mountSocialGraph } from './modules/social-graph'

export type { AppDeps }

export async function buildApp(deps: AppDeps) {
  const container = createKernelContainer(deps)
  bindIdentity(container)
  bindSocialGraph(container)
  bindNotifications(container)
  const identity = await mountIdentity(container)
  const social = await mountSocialGraph(container)
  const notifications = await mountNotifications(container)
  return new Elysia({ prefix: '/api/v1' })
    .onError(({ error, set, code }) => {
      if (error instanceof AppError) {
        set.status = error.status
        return { error: { code: error.code, message: error.message } }
      }
      if (code === 'VALIDATION') {
        set.status = 422
        return { error: { code: 'validation', message: 'Invalid input' } }
      }
      if (code === 'NOT_FOUND') {
        set.status = 404
        return { error: { code: 'not_found', message: 'Route not found' } }
      }
      console.error(error)
      set.status = 500
      return { error: { code: 'internal', message: 'Internal error' } }
    })
    .get('/health', () => ({ ok: true }))
    .use(identity)
    .use(social)
    .use(notifications)
}
export type App = Awaited<ReturnType<typeof buildApp>>

import { Elysia } from 'elysia'
import type { CommandBus } from './kernel/command-bus'
import { AppError } from './kernel/errors'
import type { EventBus } from './kernel/event-bus'
import type { QueryBus } from './kernel/query-bus'

export type AppDeps = { commands: CommandBus; queries: QueryBus; events: EventBus }

export function buildApp(_deps: AppDeps) {
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
}
export type App = ReturnType<typeof buildApp>

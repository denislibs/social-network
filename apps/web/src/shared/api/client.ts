import { createApi } from '@vkc/contracts'
import type { UnauthorizedBus } from './unauthorized'

export type ApiClient = ReturnType<typeof createApi>
export { createApi }

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type EdenResult<T> = { data: T | null; error: { status: number; value: unknown } | null }

/**
 * `silent401: true` — caller handles 401 itself (login, /me, logout).
 * `{ bus }` — any other authenticated call; the bus is notified on 401.
 * Required, with no default, so the compiler forces every call site to pick one.
 */
export type UnwrapOptions = { silent401: true } | { bus: UnauthorizedBus; silent401?: false }

export function unwrap<T>(res: EdenResult<T>, opts: UnwrapOptions): T {
  if (res.error) {
    const body = res.error.value as { error?: { code?: string; message?: string } } | undefined
    const code = body?.error?.code ?? (res.error.status === 422 ? 'validation' : 'unknown')
    const message = body?.error?.message ?? 'Request failed'
    if (res.error.status === 401 && 'bus' in opts) opts.bus.emit()
    throw new ApiError(res.error.status, code, message)
  }
  return res.data as T
}

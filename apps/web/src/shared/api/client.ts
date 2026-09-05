import { createApi } from '@vkc/contracts'
import { APP_ORIGIN } from '@/shared/config'
import { emitUnauthorized } from './unauthorized'

export const api = createApi(APP_ORIGIN)

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

export function unwrap<T>(res: EdenResult<T>, opts: { silent401?: boolean } = {}): T {
  if (res.error) {
    const body = res.error.value as { error?: { code?: string; message?: string } } | undefined
    const code = body?.error?.code ?? (res.error.status === 422 ? 'validation' : 'unknown')
    const message = body?.error?.message ?? 'Request failed'
    if (res.error.status === 401 && !opts.silent401) emitUnauthorized()
    throw new ApiError(res.error.status, code, message)
  }
  return res.data as T
}

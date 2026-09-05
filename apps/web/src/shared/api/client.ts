import { createApi } from '@vkc/contracts'

export const api = createApi(window.location.origin)

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

/**
 * Разворачивает ответ Eden: возвращает `data` либо бросает `ApiError`.
 * Наш API отдаёт `{ error: { code, message } }`; для 422 без нашего формата
 * (валидация самой Elysia) подставляем код `validation`.
 */
export function unwrap<T>(res: {
  data: T | null
  error: { status: number; value: unknown } | null
}): T {
  if (res.error) {
    const v = res.error.value as { error?: { code?: string; message?: string } } | undefined
    throw new ApiError(
      res.error.status,
      v?.error?.code ?? (res.error.status === 422 ? 'validation' : 'unknown'),
      v?.error?.message ?? 'Request failed',
    )
  }
  return res.data as T
}

/**
 * Достаёт код и сообщение из пойманной ошибки. Намеренно не `instanceof ApiError`:
 * ошибка может прийти из замоканного модуля или из другой копии модуля, поэтому
 * ориентируемся на форму значения — строковое поле `code` у `Error`.
 */
export function errorInfo(e: unknown): { code: string; message: string } | null {
  if (!(e instanceof Error)) return null
  const code = (e as { code?: unknown }).code
  return typeof code === 'string' ? { code, message: e.message } : null
}

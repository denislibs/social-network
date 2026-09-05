import { describe, expect, it, vi } from 'vitest'
import { ApiError, unwrap } from './client'
import { onUnauthorized } from './unauthorized'

describe('unwrap', () => {
  it('returns data', () => {
    expect(unwrap({ data: { ok: 1 }, error: null })).toEqual({ ok: 1 })
  })
  it('throws ApiError with code/message from body', () => {
    expect(() =>
      unwrap({
        data: null,
        error: {
          status: 409,
          value: { error: { code: 'login_taken', message: 'Login is already taken' } },
        },
      }),
    ).toThrowError(
      expect.objectContaining({
        status: 409,
        code: 'login_taken',
        message: 'Login is already taken',
      }),
    )
  })
  it('maps bodyless 422 to validation', () => {
    try {
      unwrap({ data: null, error: { status: 422, value: 'x' } })
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).code).toBe('validation')
    }
  })
  it('emits unauthorized on 401 unless silenced', () => {
    const h = vi.fn()
    const off = onUnauthorized(h)
    expect(() => unwrap({ data: null, error: { status: 401, value: {} } })).toThrow()
    expect(h).toHaveBeenCalledTimes(1)
    expect(() =>
      unwrap({ data: null, error: { status: 401, value: {} } }, { silent401: true }),
    ).toThrow()
    expect(h).toHaveBeenCalledTimes(1)
    off()
  })
})

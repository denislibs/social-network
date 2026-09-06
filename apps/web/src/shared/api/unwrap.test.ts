import { describe, expect, it, vi } from 'vitest'
import { ApiError, unwrap } from './client'
import { UnauthorizedBus } from './unauthorized'

const err = (status: number, code?: string) => ({
  data: null,
  error: { status, value: code ? { error: { code, message: 'm' } } : undefined },
})

describe('unwrap', () => {
  it('returns data on success', () => {
    expect(unwrap({ data: { ok: 1 }, error: null })).toEqual({ ok: 1 })
  })
  it('throws ApiError with code from body, validation for 422, unknown otherwise', () => {
    expect(() => unwrap(err(409, 'login_taken'))).toThrow(ApiError)
    expect(() => unwrap(err(422))).toThrow(expect.objectContaining({ code: 'validation' }))
    expect(() => unwrap(err(500))).toThrow(expect.objectContaining({ code: 'unknown' }))
  })
  it('emits on the given bus for 401 unless silent401', () => {
    const bus = new UnauthorizedBus()
    const h = vi.fn()
    bus.on(h)
    expect(() => unwrap(err(401), { bus })).toThrow(ApiError)
    expect(() => unwrap(err(401), { bus, silent401: true })).toThrow(ApiError)
    expect(h).toHaveBeenCalledTimes(1)
  })
})

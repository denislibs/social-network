import { describe, expect, it, vi } from 'vitest'
import { ApiError, unwrap } from './client'
import { UnauthorizedBus } from './unauthorized'

const err = (status: number, code?: string) => ({
  data: null,
  error: { status, value: code ? { error: { code, message: 'm' } } : undefined },
})

describe('unwrap', () => {
  it('returns data on success', () => {
    expect(unwrap({ data: { ok: 1 }, error: null }, { silent401: true })).toEqual({ ok: 1 })
  })
  it('throws ApiError with code from body, validation for 422, unknown otherwise', () => {
    expect(() => unwrap(err(409, 'login_taken'), { silent401: true })).toThrow(
      expect.objectContaining({ status: 409, code: 'login_taken', message: 'm' }),
    )
    expect(() => unwrap(err(422), { silent401: true })).toThrow(
      expect.objectContaining({ code: 'validation' }),
    )
    expect(() => unwrap(err(500), { silent401: true })).toThrow(
      expect.objectContaining({ code: 'unknown' }),
    )
  })
  it('emits on the given bus for 401 unless silent401', () => {
    const bus = new UnauthorizedBus()
    const h = vi.fn()
    bus.on(h)
    expect(() => unwrap(err(401), { bus })).toThrow(ApiError)
    expect(() => unwrap(err(401), { silent401: true })).toThrow(ApiError)
    expect(h).toHaveBeenCalledTimes(1)
  })
  it('requires an explicit 401 policy at compile time (never invoked at runtime)', () => {
    // Body is type-checked by `tsc` even though this function is never called;
    // that's what makes the two `@ts-expect-error` lines below load-bearing.
    function typeOnly() {
      // @ts-expect-error opts is required — no default, caller must pick a policy
      unwrap(err(401))
      // @ts-expect-error {} matches neither UnwrapOptions member
      unwrap(err(401), {})
    }
    expect(typeof typeOnly).toBe('function')
  })
})

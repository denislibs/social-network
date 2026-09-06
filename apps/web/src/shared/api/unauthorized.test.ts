import { describe, expect, it, vi } from 'vitest'
import { UnauthorizedBus } from './unauthorized'

describe('UnauthorizedBus', () => {
  it('notifies subscribers and stops after unsubscribe', () => {
    const bus = new UnauthorizedBus()
    const h = vi.fn()
    const off = bus.on(h)
    bus.emit()
    off()
    bus.emit()
    expect(h).toHaveBeenCalledTimes(1)
  })
})

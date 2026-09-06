import { describe, expect, it } from 'bun:test'
import { CommandBus } from './command-bus'
import { createKernelContainer } from './container'
import { EventBus } from './event-bus'
import { QueryBus } from './query-bus'
import { KERNEL } from './tokens'

describe('createKernelContainer', () => {
  it('exposes the provided kernel services as singletons', () => {
    const commands = new CommandBus()
    const c = createKernelContainer({
      db: {} as never,
      redis: {} as never,
      commands,
      queries: new QueryBus(),
      events: new EventBus(),
      cookieSecure: true,
    })
    expect(c.get(KERNEL.CommandBus)).toBe(commands)
    expect(c.get(KERNEL.Config).cookieSecure).toBe(true)
    expect(c.get(KERNEL.EventBus)).toBe(c.get(KERNEL.EventBus))
  })
})

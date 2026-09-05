import { describe, expect, it } from 'bun:test'
import { type Command, CommandBus } from './command-bus'
import { type DomainEvent, EventBus } from './event-bus'
import { type Query, QueryBus } from './query-bus'

class Add implements Command<number> {
  declare readonly __result: number
  constructor(
    readonly a: number,
    readonly b: number,
  ) {}
}
class Echo implements Query<string> {
  declare readonly __result: string
  constructor(readonly s: string) {}
}

describe('CommandBus', () => {
  it('routes command to its handler and returns typed result', async () => {
    const bus = new CommandBus()
    bus.register(Add, async (c) => c.a + c.b)
    const r: number = await bus.execute(new Add(2, 3))
    expect(r).toBe(5)
  })
  it('throws on unknown command and on duplicate registration', async () => {
    const bus = new CommandBus()
    await expect(bus.execute(new Add(1, 1))).rejects.toThrow('No handler for Add')
    bus.register(Add, async () => 0)
    expect(() => bus.register(Add, async () => 0)).toThrow('already registered')
  })
})

describe('QueryBus', () => {
  it('asks', async () => {
    const bus = new QueryBus()
    bus.register(Echo, async (q) => q.s.toUpperCase())
    expect(await bus.ask(new Echo('hi'))).toBe('HI')
  })
})

describe('EventBus', () => {
  it('delivers to all subscribers of a type, keeps going after a failing one', async () => {
    const bus = new EventBus({ error: () => {} })
    const seen: string[] = []
    bus.subscribe('UserRegistered', () => {
      throw new Error('boom')
    })
    bus.subscribe('UserRegistered', (e) => {
      seen.push(String((e.payload as { id: number }).id))
    })
    bus.subscribe('Other', () => {
      seen.push('other')
    })
    const ev: DomainEvent = { type: 'UserRegistered', occurredAt: new Date(), payload: { id: 7 } }
    await bus.publish([ev])
    expect(seen).toEqual(['7'])
  })
})

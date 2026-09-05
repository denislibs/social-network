export type DomainEvent<T extends string = string, P = unknown> = {
  type: T
  occurredAt: Date
  payload: P
}
type Logger = { error: (msg: string, meta?: unknown) => void }
export class EventBus {
  private subs = new Map<string, Array<(e: DomainEvent) => Promise<void> | void>>()
  constructor(private log: Logger = console) {}
  subscribe<E extends DomainEvent>(type: E['type'], h: (e: E) => Promise<void> | void): void {
    const list = this.subs.get(type) ?? []
    list.push(h as (e: DomainEvent) => Promise<void> | void)
    this.subs.set(type, list)
  }
  async publish(events: DomainEvent[]): Promise<void> {
    for (const e of events) {
      for (const h of this.subs.get(e.type) ?? []) {
        try {
          await h(e)
        } catch (err) {
          this.log.error(`event handler failed for ${e.type}`, err)
        }
      }
    }
  }
}

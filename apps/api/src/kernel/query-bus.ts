export interface Query<R> {
  readonly __result: R
}
export type ResultOf<Q> = Q extends Query<infer R> ? R : never
type Ctor<Q> = new (...args: never[]) => Q
type Handler<Q, R> = (query: Q) => Promise<R>

export class QueryBus {
  private handlers = new Map<Ctor<unknown>, Handler<unknown, unknown>>()
  register<Q extends object, R>(ctor: Ctor<Q>, handler: Handler<Q, R>): void {
    if (this.handlers.has(ctor)) throw new Error(`Handler for ${ctor.name} already registered`)
    this.handlers.set(ctor, handler as Handler<unknown, unknown>)
  }
  async ask<Q extends Query<unknown>>(query: Q): Promise<ResultOf<Q>> {
    const h = this.handlers.get((query as object).constructor as Ctor<unknown>)
    if (!h) throw new Error(`No handler for ${(query as object).constructor.name}`)
    return (await h(query)) as ResultOf<Q>
  }
}

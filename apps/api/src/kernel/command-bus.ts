export interface Command<R> {
  readonly __result: R
}
export type ResultOf<C> = C extends Command<infer R> ? R : never
type Ctor<C> = new (...args: never[]) => C
type Handler<C, R> = (cmd: C) => Promise<R>

export class CommandBus {
  private handlers = new Map<Ctor<unknown>, Handler<unknown, unknown>>()
  register<C extends object, R>(ctor: Ctor<C>, handler: Handler<C, R>): void {
    if (this.handlers.has(ctor)) throw new Error(`Handler for ${ctor.name} already registered`)
    this.handlers.set(ctor, handler as Handler<unknown, unknown>)
  }
  async execute<C extends Command<unknown>>(cmd: C): Promise<ResultOf<C>> {
    const h = this.handlers.get((cmd as object).constructor as Ctor<unknown>)
    if (!h) throw new Error(`No handler for ${(cmd as object).constructor.name}`)
    return (await h(cmd)) as ResultOf<C>
  }
}

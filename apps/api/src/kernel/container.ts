import type { AppDeps } from './deps'
import { Container } from './di'
import { KERNEL } from './tokens'

export function createKernelContainer(d: AppDeps): Container {
  const c = new Container({ defaultScope: 'Singleton' })
  c.bind(KERNEL.Db).toConstantValue(d.db)
  c.bind(KERNEL.Redis).toConstantValue(d.redis)
  c.bind(KERNEL.CommandBus).toConstantValue(d.commands)
  c.bind(KERNEL.QueryBus).toConstantValue(d.queries)
  c.bind(KERNEL.EventBus).toConstantValue(d.events)
  c.bind(KERNEL.Config).toConstantValue({ cookieSecure: d.cookieSecure })
  return c
}

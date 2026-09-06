import type { Container } from '../../../kernel/di'
import { KERNEL } from '../../../kernel/tokens'
import { IDENTITY } from '../application/ports'
import { BunPasswordHasher } from './bun-password-hasher'
import { DrizzleUserReadModel } from './drizzle-user-read-model'
import { DrizzleUserRepository } from './drizzle-user-repository'
import { RedisSessionStore } from './redis-session-store'

export function bindIdentityInfrastructure(c: Container): void {
  c.bind(IDENTITY.UserRepository)
    .toResolvedValue((db) => new DrizzleUserRepository(db), [KERNEL.Db])
    .inSingletonScope()
  c.bind(IDENTITY.UserReadModel)
    .toResolvedValue((db) => new DrizzleUserReadModel(db), [KERNEL.Db])
    .inSingletonScope()
  c.bind(IDENTITY.SessionStore)
    .toResolvedValue((redis) => new RedisSessionStore(redis), [KERNEL.Redis])
    .inSingletonScope()
  c.bind(IDENTITY.PasswordHasher).toConstantValue(new BunPasswordHasher())
}

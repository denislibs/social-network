import type { PasswordHasher } from '../application/ports'

export class BunPasswordHasher implements PasswordHasher {
  hash(pw: string) {
    return Bun.password.hash(pw, { algorithm: 'argon2id', memoryCost: 19456, timeCost: 2 })
  }
  verify(pw: string, hash: string) {
    return Bun.password.verify(pw, hash)
  }
}

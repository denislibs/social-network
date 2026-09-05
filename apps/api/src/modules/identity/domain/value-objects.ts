import { DomainRuleError } from '../../../kernel/errors'
export class Login {
  private constructor(readonly value: string) {}
  static create(raw: string): Login {
    const v = raw.trim().toLowerCase()
    if (!/^[a-z0-9_.]{3,32}$/.test(v))
      throw new DomainRuleError(
        'invalid_login',
        'invalid_login: Login must be 3-32 chars of a-z, 0-9, _ or .',
      )
    return new Login(v)
  }
  static fromTrusted(v: string): Login {
    return new Login(v)
  }
}
export const Password = {
  assertStrong(raw: string): void {
    if (raw.length < 8)
      throw new DomainRuleError(
        'weak_password',
        'weak_password: Password must be at least 8 characters',
      )
  },
}

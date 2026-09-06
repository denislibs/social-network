import { DomainRuleError } from '../../../kernel/errors'

export function orderPair(a: number, b: number): { lo: number; hi: number } {
  return a < b ? { lo: a, hi: b } : { lo: b, hi: a }
}

export class CommunityName {
  private constructor(readonly value: string) {}
  static create(raw: string): CommunityName {
    const v = raw.trim()
    if (v.length < 2 || v.length > 120)
      throw new DomainRuleError('invalid_community_name', 'Community name must be 2-120 characters')
    return new CommunityName(v)
  }
}

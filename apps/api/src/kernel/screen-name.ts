import { DomainRuleError } from './errors'

export const RESERVED_SCREEN_NAMES: ReadonlySet<string> = new Set([
  'feed',
  'im',
  'friends',
  'communities',
  'photos',
  'music',
  'search',
  'login',
  'register',
  'edit',
  'notifications',
  'api',
])
const RESERVED_PREFIX = /^(id|club)\d/

export class ScreenName {
  private constructor(readonly value: string) {}
  static create(raw: string): ScreenName {
    const v = raw.trim().toLowerCase()
    // Checked before the length/charset rule: some reserved words (e.g. "im") are
    // shorter than the minimum screen-name length, so they'd otherwise surface as
    // invalid_screen_name instead of the more specific screen_name_reserved.
    if (RESERVED_SCREEN_NAMES.has(v) || RESERVED_PREFIX.test(v))
      throw new DomainRuleError('screen_name_reserved', 'This screen name is reserved')
    if (!/^[a-z][a-z0-9_.]{2,31}$/.test(v))
      throw new DomainRuleError(
        'invalid_screen_name',
        'Screen name must be 3-32 chars: a-z, 0-9, _ or ., starting with a letter',
      )
    return new ScreenName(v)
  }
  static fromTrusted(v: string): ScreenName {
    return new ScreenName(v)
  }
}

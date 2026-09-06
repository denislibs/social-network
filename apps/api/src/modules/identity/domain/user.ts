import { CITIES } from '@vkc/contracts'
import { DomainRuleError } from '../../../kernel/errors'
import type { DomainEvent } from '../../../kernel/event-bus'
import { ScreenName } from '../../../kernel/screen-name'
import { Login, Password } from './value-objects'

export interface PasswordHasher {
  hash(pw: string): Promise<string>
  verify(pw: string, hash: string): Promise<boolean>
}

export type UserProps = {
  id: number | null
  login: Login
  passwordHash: string
  firstName: string
  lastName: string
  screenName: string | null
  status: string | null
  bio: string | null
  city: string | null
  birthday: string | null
  isVerified: boolean
  createdAt: Date
}

export type ProfilePatch = {
  status?: string | null
  bio?: string | null
  city?: string | null
  birthday?: string | null
  screenName?: string | null
}

const STATUS_MAX_LEN = 140
const BIO_MAX_LEN = 2000
const MIN_BIRTHDAY = '1900-01-01'

/**
 * Validated purely on the ISO `YYYY-MM-DD` string form: lexicographic comparison of
 * zero-padded ISO date strings matches chronological order, so this avoids any timezone
 * ambiguity a `Date` round-trip could introduce.
 */
function assertValidBirthday(v: string): void {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) throw new DomainRuleError('invalid_birthday', 'Birthday must be an ISO date (YYYY-MM-DD)')
  const [, y, mo, d] = m
  const asDate = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)))
  const isRealDate =
    asDate.getUTCFullYear() === Number(y) &&
    asDate.getUTCMonth() === Number(mo) - 1 &&
    asDate.getUTCDate() === Number(d)
  const todayIso = new Date().toISOString().slice(0, 10)
  if (!isRealDate || v < MIN_BIRTHDAY || v > todayIso)
    throw new DomainRuleError(
      'invalid_birthday',
      `Birthday must be a real date between ${MIN_BIRTHDAY} and today`,
    )
}

export class User {
  private events: DomainEvent[] = []
  private constructor(private props: UserProps) {}

  static async register(
    input: { login: string; password: string; firstName: string; lastName: string },
    hasher: PasswordHasher,
  ): Promise<User> {
    const login = Login.create(input.login)
    Password.assertStrong(input.password)
    const firstName = input.firstName.trim()
    const lastName = input.lastName.trim()
    if (!firstName || !lastName) throw new DomainRuleError('empty_name', 'Name is required')
    const u = new User({
      id: null,
      login,
      passwordHash: await hasher.hash(input.password),
      firstName,
      lastName,
      screenName: null,
      status: null,
      bio: null,
      city: null,
      birthday: null,
      isVerified: false,
      createdAt: new Date(),
    })
    u.events.push({
      type: 'UserRegistered',
      occurredAt: new Date(),
      payload: { userId: null, login: login.value },
    })
    return u
  }
  static rehydrate(props: UserProps): User {
    return new User(props)
  }

  get id() {
    return this.props.id
  }
  get login() {
    return this.props.login
  }
  get passwordHash() {
    return this.props.passwordHash
  }
  get firstName() {
    return this.props.firstName
  }
  get lastName() {
    return this.props.lastName
  }
  get screenName() {
    return this.props.screenName
  }
  get status() {
    return this.props.status
  }
  get bio() {
    return this.props.bio
  }
  get city() {
    return this.props.city
  }
  get birthday() {
    return this.props.birthday
  }
  get isVerified() {
    return this.props.isVerified
  }
  get createdAt() {
    return this.props.createdAt
  }

  assignId(id: number): void {
    this.props.id = id
    for (const e of this.events)
      if (e.type === 'UserRegistered') (e.payload as { userId: number | null }).userId = id
  }
  verifyPassword(pw: string, hasher: PasswordHasher): Promise<boolean> {
    return hasher.verify(pw, this.props.passwordHash)
  }
  /**
   * Only fields present in `patch` (not `undefined`) are applied; `null` clears a field.
   * No domain event: a profile edit is not something other contexts react to.
   */
  updateProfile(patch: ProfilePatch): void {
    if (patch.status !== undefined) {
      const status = patch.status === null ? null : patch.status.trim()
      if (status !== null && status.length > STATUS_MAX_LEN)
        throw new DomainRuleError(
          'status_too_long',
          `Status must be at most ${STATUS_MAX_LEN} characters`,
        )
      this.props.status = status
    }
    if (patch.bio !== undefined) {
      const bio = patch.bio === null ? null : patch.bio.trim()
      if (bio !== null && bio.length > BIO_MAX_LEN)
        throw new DomainRuleError('bio_too_long', `Bio must be at most ${BIO_MAX_LEN} characters`)
      this.props.bio = bio
    }
    if (patch.city !== undefined) {
      if (patch.city !== null && !(CITIES as readonly string[]).includes(patch.city))
        throw new DomainRuleError('invalid_city', 'Unknown city')
      this.props.city = patch.city
    }
    if (patch.birthday !== undefined) {
      if (patch.birthday !== null) assertValidBirthday(patch.birthday)
      this.props.birthday = patch.birthday
    }
    if (patch.screenName !== undefined) {
      this.props.screenName =
        patch.screenName === null ? null : ScreenName.create(patch.screenName).value
    }
  }
  pullEvents(): DomainEvent[] {
    const out = this.events
    this.events = []
    return out
  }
}

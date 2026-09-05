import { DomainRuleError } from '../../../kernel/errors'
import type { DomainEvent } from '../../../kernel/event-bus'
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
  createdAt: Date
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
  pullEvents(): DomainEvent[] {
    const out = this.events
    this.events = []
    return out
  }
}

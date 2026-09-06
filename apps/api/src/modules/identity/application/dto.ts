import type { Counters, Relation } from '../../../kernel/social-read'
import type { User } from '../domain/user'
export type UserDto = {
  id: number
  login: string
  firstName: string
  lastName: string
  screenName: string | null
  createdAt: string
}
export function toUserDto(u: User): UserDto {
  if (u.id === null) throw new Error('user has no id')
  return {
    id: u.id,
    login: u.login.value,
    firstName: u.firstName,
    lastName: u.lastName,
    screenName: u.screenName,
    createdAt: u.createdAt.toISOString(),
  }
}

/**
 * Copy of social-graph's `UserCellDto` shape (identity must not import from social-graph — see
 * `modules/boundaries.test.ts`). Task 8 unifies both into a shared `modules/dto.ts` export.
 */
export type UserCellDto = {
  id: number
  firstName: string
  lastName: string
  screenName: string | null
  city: string | null
  isVerified: boolean
  lastSeenAt: string | null
}

/**
 * Everything a profile carries that is safe for anyone to read. `login` is deliberately absent:
 * it is the credential the account signs in with, so it is not part of a public profile.
 */
export type PublicProfile = Omit<UserDto, 'login'> & {
  status: string | null
  bio: string | null
  city: string | null
  birthday: string | null
  isVerified: boolean
}

/** What the read model hands back — the public fields plus the private `login`, which the query
 * handler then keeps or drops depending on who is asking. */
export type ProfileSource = PublicProfile & { login: string }

/**
 * `login` is present **only** when `relation === 'self'`; for any other viewer (including an
 * unauthenticated one) the field is absent from the response entirely.
 */
export type ProfileDto = PublicProfile & {
  login?: string
  counters: Counters
  relation: Relation
}

export function toProfileDto(user: User, counters: Counters, relation: Relation): ProfileDto {
  const { login, ...base } = toUserDto(user)
  return {
    ...base,
    ...(relation === 'self' ? { login } : {}),
    status: user.status,
    bio: user.bio,
    city: user.city,
    birthday: user.birthday,
    isVerified: user.isVerified,
    counters,
    relation,
  }
}

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

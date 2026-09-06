import type { UserCellDto } from './types'

/** `den` for a claimed screen name, `id5` otherwise — matches VK's own URL scheme. */
export function userHandle(u: Pick<UserCellDto, 'id' | 'screenName'>): string {
  return u.screenName ?? `id${u.id}`
}

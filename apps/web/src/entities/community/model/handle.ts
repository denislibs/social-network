import type { CommunityCellDto } from './types'

/** Communities always have a claimed screen name, unlike users. */
export function communityHandle(c: Pick<CommunityCellDto, 'screenName'>): string {
  return c.screenName
}

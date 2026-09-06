import type { Query } from '../../../../kernel/query-bus'
import type { Page, UserCellDto } from '../dto'
import type { SocialReadModel } from '../ports'

export class GetFriends implements Query<Page<UserCellDto>> {
  declare readonly __result: Page<UserCellDto>
  constructor(
    readonly userId: number,
    readonly cursor?: string,
  ) {}
}

export const getFriendsHandler =
  (d: { read: SocialReadModel }) =>
  async (q: GetFriends): Promise<Page<UserCellDto>> =>
    d.read.friends(q.userId, q.cursor)

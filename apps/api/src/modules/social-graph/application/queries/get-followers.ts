import type { Query } from '../../../../kernel/query-bus'
import type { Page, UserCellDto } from '../dto'
import type { SocialReadModel } from '../ports'

export class GetFollowers implements Query<Page<UserCellDto>> {
  declare readonly __result: Page<UserCellDto>
  constructor(
    readonly userId: number,
    readonly cursor?: string,
  ) {}
}

export const getFollowersHandler =
  (d: { read: SocialReadModel }) =>
  async (q: GetFollowers): Promise<Page<UserCellDto>> =>
    d.read.followers(q.userId, q.cursor)

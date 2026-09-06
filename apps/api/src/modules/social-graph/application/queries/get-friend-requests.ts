import type { Query } from '../../../../kernel/query-bus'
import type { Page, UserCellDto } from '../dto'
import type { SocialReadModel } from '../ports'

export class GetFriendRequests implements Query<Page<UserCellDto>> {
  declare readonly __result: Page<UserCellDto>
  constructor(
    readonly me: number,
    readonly dir: 'incoming' | 'outgoing',
    readonly cursor?: string,
  ) {}
}

export const getFriendRequestsHandler =
  (d: { read: SocialReadModel }) =>
  async (q: GetFriendRequests): Promise<Page<UserCellDto>> =>
    d.read.requests(q.me, q.dir, q.cursor)

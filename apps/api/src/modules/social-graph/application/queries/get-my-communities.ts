import type { Query } from '../../../../kernel/query-bus'
import type { CommunityCellDto } from '../dto'
import type { SocialReadModel } from '../ports'

export class GetMyCommunities implements Query<CommunityCellDto[]> {
  declare readonly __result: CommunityCellDto[]
  constructor(readonly me: number) {}
}

export const getMyCommunitiesHandler =
  (d: { read: SocialReadModel }) =>
  async (q: GetMyCommunities): Promise<CommunityCellDto[]> =>
    d.read.myCommunities(q.me)

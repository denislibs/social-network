import type { Query } from '../../../../kernel/query-bus'
import type { CommunityCellDto } from '../dto'
import type { SocialReadModel } from '../ports'

export class SearchCommunities implements Query<CommunityCellDto[]> {
  declare readonly __result: CommunityCellDto[]
  constructor(
    readonly q: string,
    readonly limit: number = 10,
  ) {}
}

export const searchCommunitiesHandler =
  (d: { read: SocialReadModel }) =>
  async (query: SearchCommunities): Promise<CommunityCellDto[]> =>
    d.read.searchCommunities(query.q, query.limit)

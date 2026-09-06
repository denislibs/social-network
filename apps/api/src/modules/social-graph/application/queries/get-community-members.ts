import type { Query } from '../../../../kernel/query-bus'
import type { Page, UserCellDto } from '../dto'
import type { SocialReadModel } from '../ports'

export class GetCommunityMembers implements Query<Page<UserCellDto>> {
  declare readonly __result: Page<UserCellDto>
  constructor(
    readonly communityId: number,
    readonly cursor?: string,
  ) {}
}

export const getCommunityMembersHandler =
  (d: { read: SocialReadModel }) =>
  async (q: GetCommunityMembers): Promise<Page<UserCellDto>> =>
    d.read.members(q.communityId, q.cursor)

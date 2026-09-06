import type { Query } from '../../../../kernel/query-bus'
import { CommunityNotFound } from '../../domain/errors'
import type { CommunityDto } from '../dto'
import type { SocialReadModel } from '../ports'

export class GetCommunity implements Query<CommunityDto> {
  declare readonly __result: CommunityDto
  constructor(
    readonly idOrScreen: string,
    readonly me: number | null,
  ) {}
}

export const getCommunityHandler =
  (d: { read: SocialReadModel }) =>
  async (q: GetCommunity): Promise<CommunityDto> => {
    const dto = await d.read.community(q.idOrScreen, q.me)
    if (!dto) throw new CommunityNotFound()
    return dto
  }

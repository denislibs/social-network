import type { Command } from '../../../../kernel/command-bus'
import { CommunityNotFound } from '../../domain/errors'
import type { CommunityRepository, FollowRepository } from '../ports'

export class FollowCommunity implements Command<{ isFollowing: true }> {
  declare readonly __result: { isFollowing: true }
  constructor(readonly input: { me: number; communityId: number }) {}
}

export function followCommunityHandler(d: {
  communities: CommunityRepository
  follows: FollowRepository
}) {
  return async (cmd: FollowCommunity) => {
    // `follows.target_id` is polymorphic and carries no foreign key, so nothing else would stop a
    // follow row pointing at a community that does not exist.
    if (!(await d.communities.findById(cmd.input.communityId))) throw new CommunityNotFound()
    await d.follows.add(cmd.input.me, { type: 'community', id: cmd.input.communityId })
    return { isFollowing: true as const }
  }
}

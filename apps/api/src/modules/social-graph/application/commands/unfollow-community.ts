import type { Command } from '../../../../kernel/command-bus'
import { CommunityNotFound } from '../../domain/errors'
import type { CommunityRepository, FollowRepository } from '../ports'

export class UnfollowCommunity implements Command<{ isFollowing: false }> {
  declare readonly __result: { isFollowing: false }
  constructor(readonly input: { me: number; communityId: number }) {}
}

export function unfollowCommunityHandler(d: {
  communities: CommunityRepository
  follows: FollowRepository
}) {
  return async (cmd: UnfollowCommunity) => {
    if (!(await d.communities.findById(cmd.input.communityId))) throw new CommunityNotFound()
    await d.follows.remove(cmd.input.me, { type: 'community', id: cmd.input.communityId })
    return { isFollowing: false as const }
  }
}

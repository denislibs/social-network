import type { Command } from '../../../../kernel/command-bus'
import type { FollowRepository } from '../ports'

export class UnfollowCommunity implements Command<{ isFollowing: false }> {
  declare readonly __result: { isFollowing: false }
  constructor(readonly input: { me: number; communityId: number }) {}
}

export function unfollowCommunityHandler(d: { follows: FollowRepository }) {
  return async (cmd: UnfollowCommunity) => {
    await d.follows.remove(cmd.input.me, { type: 'community', id: cmd.input.communityId })
    return { isFollowing: false as const }
  }
}

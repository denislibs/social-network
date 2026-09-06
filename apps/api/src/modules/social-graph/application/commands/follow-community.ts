import type { Command } from '../../../../kernel/command-bus'
import type { FollowRepository } from '../ports'

export class FollowCommunity implements Command<{ isFollowing: true }> {
  declare readonly __result: { isFollowing: true }
  constructor(readonly input: { me: number; communityId: number }) {}
}

export function followCommunityHandler(d: { follows: FollowRepository }) {
  return async (cmd: FollowCommunity) => {
    await d.follows.add(cmd.input.me, { type: 'community', id: cmd.input.communityId })
    return { isFollowing: true as const }
  }
}

import type { Topic } from '@vkc/contracts'
import type { Command } from '../../../../kernel/command-bus'
import type { EventBus } from '../../../../kernel/event-bus'
import { Community } from '../../domain/community'
import type { CommunityDto } from '../dto'
import type { CommunityRepository, FollowRepository } from '../ports'

export class CreateCommunity implements Command<CommunityDto> {
  declare readonly __result: CommunityDto
  constructor(
    readonly input: {
      me: number
      name: string
      screenName: string
      topic: Topic
      description: string | null
    },
  ) {}
}

export function createCommunityHandler(d: {
  communities: CommunityRepository
  follows: FollowRepository
  events: EventBus
}) {
  return async (cmd: CreateCommunity): Promise<CommunityDto> => {
    const { me, name, screenName, topic, description } = cmd.input
    const community = Community.create({ ownerId: me, name, screenName, topic, description })
    const saved = await d.communities.save(community)
    // The creator both administers and follows their own community from the start.
    await d.follows.add(me, { type: 'community', id: saved.props.id as number })
    await d.events.publish(saved.pullEvents())
    return {
      id: saved.props.id as number,
      screenName: saved.props.screenName,
      name: saved.props.name,
      description: saved.props.description,
      topic: saved.props.topic,
      isVerified: false,
      membersCount: saved.membersCount(),
      membership: 'admin',
      isFollowing: true,
    }
  }
}

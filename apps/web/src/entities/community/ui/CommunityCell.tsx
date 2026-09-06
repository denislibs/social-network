import { Icon16Verified } from '@vkontakte/icons'
import { Avatar, calcInitialsAvatarColor, SimpleCell } from '@vkontakte/vkui'
import type { ReactNode } from 'react'
import { initials, pluralRu, RouterAnchor, topicLabel } from '@/shared/lib'
import { communityHandle } from '../model/handle'
import type { CommunityCellDto } from '../model/types'

const MEMBER_FORMS: [string, string, string] = ['участник', 'участника', 'участников']

type Props = {
  community: CommunityCellDto
  after?: ReactNode
}

export function CommunityCell({ community, after }: Props) {
  const [firstWord = '', secondWord = ''] = community.name.trim().split(/\s+/)
  return (
    <SimpleCell
      Component={RouterAnchor}
      href={`/${communityHandle(community)}`}
      before={
        <Avatar
          size={48}
          initials={initials(firstWord, secondWord)}
          gradientColor={calcInitialsAvatarColor(community.id)}
        />
      }
      subtitle={`${topicLabel(community.topic)} · ${community.membersCount} ${pluralRu(community.membersCount, MEMBER_FORMS)}`}
      after={after}
    >
      {community.name}
      {community.isVerified && <Icon16Verified width={16} height={16} />}
    </SimpleCell>
  )
}

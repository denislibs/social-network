import { Icon16Verified } from '@vkontakte/icons'
import {
  Avatar,
  Box,
  ButtonGroup,
  calcInitialsAvatarColor,
  Flex,
  Footnote,
  Group,
  Title,
} from '@vkontakte/vkui'
import { FollowButton, JoinButton } from '@/features/community-membership'
import { initials, pluralRu, topicLabel } from '@/shared/lib'
import { useCommunity } from '../model/useCommunity'
import { CommunityHeaderSkeleton } from './CommunityHeaderSkeleton'

const MEMBER_FORMS: [string, string, string] = ['участник', 'участника', 'участников']

export function CommunityHeader({ handle }: { handle: string }) {
  const { community, isPending, isError } = useCommunity(handle)

  if (isPending) return <CommunityHeaderSkeleton />
  if (isError || !community) return null

  const [firstWord = '', secondWord = ''] = community.name.trim().split(/\s+/)

  return (
    <Group mode="card">
      <Box padding="system">
        <Flex align="center" gap="m">
          <Avatar
            size={96}
            initials={initials(firstWord, secondWord)}
            gradientColor={calcInitialsAvatarColor(community.id)}
          />
          <Flex direction="column" gap="s">
            <Flex align="center" gap="xs">
              <Title level="2">{community.name}</Title>
              {community.isVerified && <Icon16Verified width={16} height={16} />}
            </Flex>
            <Footnote>
              {topicLabel(community.topic)} · {community.membersCount}{' '}
              {pluralRu(community.membersCount, MEMBER_FORMS)}
            </Footnote>
            <ButtonGroup mode="horizontal" gap="s">
              <JoinButton community={community} />
              <FollowButton community={community} />
            </ButtonGroup>
          </Flex>
        </Flex>
      </Box>
    </Group>
  )
}

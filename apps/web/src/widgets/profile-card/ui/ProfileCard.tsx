import { Icon16Verified } from '@vkontakte/icons'
import {
  Box,
  Button,
  Flex,
  Footnote,
  Gradient,
  Group,
  SimpleCell,
  Text,
  Title,
} from '@vkontakte/vkui'
import { type ProfileDto, UserAvatar } from '@/entities/user'
import { FriendButton } from '@/features/friendship'
import { RouterAnchor } from '@/shared/lib'
import { useProfile } from '../model/useProfile'
import { useRelation } from '../model/useRelation'
import { ProfileCardSkeleton } from './ProfileCardSkeleton'

function registeredYear(createdAt: string): number {
  return new Date(createdAt).getFullYear()
}

function ProfileCardLoaded({ profile, handle }: { profile: ProfileDto; handle: string }) {
  const relation = useRelation(profile)
  const isSelf = profile.relation === 'self'
  const friendsHref = isSelf ? '/friends' : `/${handle}/friends`

  return (
    <Group mode="card">
      <Box blockSize={120}>
        <Gradient />
      </Box>
      <Box padding="system">
        <Flex direction="column" gap="m" align="start">
          <UserAvatar user={profile} size={96} />
          <Flex align="center" gap="xs">
            <Title level="2">
              {profile.firstName} {profile.lastName}
            </Title>
            {profile.isVerified && <Icon16Verified width={16} height={16} />}
          </Flex>
          {profile.status && <Text>{profile.status}</Text>}
          <Footnote>
            {[profile.city, `на сайте с ${registeredYear(profile.createdAt)}`]
              .filter(Boolean)
              .join(' · ')}
          </Footnote>
          {isSelf ? (
            <Button mode="secondary" size="s" Component={RouterAnchor} href="/edit">
              Редактировать
            </Button>
          ) : (
            <FriendButton userId={profile.id} relation={relation} />
          )}
        </Flex>
      </Box>
      <SimpleCell Component={RouterAnchor} href={friendsHref}>
        {`Друзья ${profile.counters.friends}`}
      </SimpleCell>
      <SimpleCell>{`Подписчики ${profile.counters.followers}`}</SimpleCell>
      {isSelf ? (
        <SimpleCell Component={RouterAnchor} href="/communities">
          {`Сообщества ${profile.counters.communities}`}
        </SimpleCell>
      ) : (
        <SimpleCell>{`Сообщества ${profile.counters.communities}`}</SimpleCell>
      )}
    </Group>
  )
}

export function ProfileCard({ handle }: { handle: string }) {
  const { profile, isPending, isError } = useProfile(handle)

  if (isPending) return <ProfileCardSkeleton />
  if (isError || !profile) return null

  return <ProfileCardLoaded profile={profile} handle={handle} />
}

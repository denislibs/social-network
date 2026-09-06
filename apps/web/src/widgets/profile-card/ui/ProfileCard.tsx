import { Icon12Dropdown, Icon16Verified, Icon24ShareOutline } from '@vkontakte/icons'
import {
  Box,
  Button,
  ButtonGroup,
  DisplayTitle,
  Flex,
  Footnote,
  Group,
  Link,
  Text,
} from '@vkontakte/vkui'
import { type ProfileDto, UserAvatar } from '@/entities/user'
import { FriendButton } from '@/features/friendship'
import { RouterAnchor } from '@/shared/lib'
import { useProfile } from '../model/useProfile'
import { useRelation } from '../model/useRelation'
import { ProfileCardSkeleton } from './ProfileCardSkeleton'
import styles from './profile-card.module.css'

function registeredYear(createdAt: string): number {
  return new Date(createdAt).getFullYear()
}

/**
 * vk.ru's profile header: a full-width card (912px, spanning both content columns) with a 200px
 * cover, a 96px avatar overlapping its bottom edge on the left, the name and status to the right
 * of the avatar and the action buttons right-aligned on the same row. The counters that used to
 * live here moved to the right column (`ProfileAside`), like on vk.ru.
 */
function ProfileCardLoaded({ profile }: { profile: ProfileDto }) {
  const relation = useRelation(profile)
  const isSelf = profile.relation === 'self'
  const subtitle = [profile.city, `на сайте с ${registeredYear(profile.createdAt)}`]
    .filter(Boolean)
    .join(' · ')

  return (
    <Group mode="card" className={styles.card}>
      <Box blockSize={200} className={styles.cover} data-testid="profile-cover" />
      <div className={styles.body}>
        <div className={styles.avatar} data-testid="profile-avatar">
          <UserAvatar user={profile} size={96} />
        </div>
        <Flex justify="space-between" align="start" gap="m">
          <Flex direction="column" gap="2xs" className={styles.identity}>
            <Flex align="center" gap="xs">
              <DisplayTitle level="2">
                {profile.firstName} {profile.lastName}
              </DisplayTitle>
              {profile.isVerified && <Icon16Verified width={16} height={16} />}
            </Flex>
            {profile.status ? (
              <Text>{profile.status}</Text>
            ) : isSelf ? (
              <Link Component={RouterAnchor} href="/edit">
                Укажите информацию о себе ›
              </Link>
            ) : null}
            <Footnote>{subtitle}</Footnote>
          </Flex>
          <ButtonGroup mode="horizontal" gap="s">
            {isSelf ? (
              <Button mode="secondary" size="m" Component={RouterAnchor} href="/edit">
                Редактировать профиль
              </Button>
            ) : (
              <FriendButton userId={profile.id} relation={relation} />
            )}
            <Button mode="secondary" size="m" aria-label="Поделиться">
              <Icon24ShareOutline />
            </Button>
            <Button mode="secondary" size="m" after={<Icon12Dropdown />}>
              Ещё
            </Button>
          </ButtonGroup>
        </Flex>
      </div>
    </Group>
  )
}

export function ProfileCard({ handle }: { handle: string }) {
  const { profile, isPending, isError } = useProfile(handle)

  if (isPending) return <ProfileCardSkeleton />
  if (isError || !profile) return null

  return <ProfileCardLoaded profile={profile} />
}

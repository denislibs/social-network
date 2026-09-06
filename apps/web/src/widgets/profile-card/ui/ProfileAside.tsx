import { Icon56UserAddOutline } from '@vkontakte/icons'
import {
  Avatar,
  Box,
  Button,
  Caption,
  calcInitialsAvatarColor,
  Group,
  Header,
  Link,
  Placeholder,
  SimpleCell,
  Subhead,
} from '@vkontakte/vkui'
import { communityHandle } from '@/entities/community'
import { type ProfileDto, UserAvatar, userHandle } from '@/entities/user'
import { initials, RouterAnchor, topicLabel } from '@/shared/lib'
import { useCommunitiesPreview } from '../model/useCommunitiesPreview'
import { useFriendsPreview } from '../model/useFriendsPreview'
import { useProfile } from '../model/useProfile'
import { FriendsGridSkeleton, ProfileAsideSkeleton } from './ProfileAsideSkeleton'
import styles from './profile-card.module.css'

/**
 * Right column of the profile page, mirroring vk.ru: a «Друзья N» card with a 3×2 avatar grid and
 * a «Сообщества N» card listing the first few communities. The followers count has no card of
 * its own here — vk.ru doesn't have one either, and it would be an empty box — it rides along in
 * `ProfileCard`'s footnote line instead. The counters come from the profile itself; only the
 * previews are fetched separately.
 */
function ProfileAsideLoaded({ profile, handle }: { profile: ProfileDto; handle: string }) {
  const isSelf = profile.relation === 'self'
  const { items: friends, isPending: friendsPending } = useFriendsPreview(profile.id)
  const { items: communities } = useCommunitiesPreview(isSelf)
  const friendsHref = isSelf ? '/friends' : `/${handle}/friends`

  return (
    <>
      <Group mode="card">
        <Header
          size="m"
          after={
            friends.length > 0 ? (
              <Link Component={RouterAnchor} href={friendsHref}>
                Все друзья
              </Link>
            ) : undefined
          }
        >
          {`Друзья ${profile.counters.friends}`}
        </Header>
        {friendsPending ? (
          <FriendsGridSkeleton />
        ) : friends.length === 0 ? (
          <Placeholder
            icon={<Icon56UserAddOutline />}
            title={isSelf ? 'У вас пока нет друзей' : 'Пока нет друзей'}
            action={
              isSelf ? (
                <Button mode="tertiary" Component={RouterAnchor} href="/friends?tab=suggestions">
                  Добавить друзей
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Box paddingInline="m" paddingBlockEnd="m">
            <div className={styles.friendsGrid}>
              {friends.map((friend) => (
                <Link
                  key={friend.id}
                  Component={RouterAnchor}
                  href={`/${userHandle(friend)}`}
                  className={styles.friend}
                  noUnderline
                >
                  <UserAvatar user={friend} size={64} />
                  <Caption>{friend.firstName}</Caption>
                </Link>
              ))}
            </div>
          </Box>
        )}
      </Group>

      <Group mode="card">
        <Header
          size="m"
          after={
            isSelf ? (
              <Link Component={RouterAnchor} href="/communities">
                Все сообщества
              </Link>
            ) : undefined
          }
        >
          {`Сообщества ${profile.counters.communities}`}
        </Header>
        {communities.map((community) => {
          const [firstWord = '', secondWord = ''] = community.name.trim().split(/\s+/)
          return (
            <SimpleCell
              key={community.id}
              Component={RouterAnchor}
              href={`/${communityHandle(community)}`}
              before={
                <Avatar
                  size={40}
                  initials={initials(firstWord, secondWord)}
                  gradientColor={calcInitialsAvatarColor(community.id)}
                />
              }
              subtitle={topicLabel(community.topic)}
            >
              <Subhead weight="2">{community.name}</Subhead>
            </SimpleCell>
          )
        })}
      </Group>
    </>
  )
}

export function ProfileAside({ handle }: { handle: string }) {
  const { profile, isPending, isError } = useProfile(handle)

  if (isPending) return <ProfileAsideSkeleton />
  if (isError || !profile) return null

  return <ProfileAsideLoaded profile={profile} handle={handle} />
}

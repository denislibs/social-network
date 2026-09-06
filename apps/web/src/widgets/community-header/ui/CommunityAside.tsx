import { Box, Caption, Group, Header, Link, Placeholder } from '@vkontakte/vkui'
import { type CommunityDto, communityHandle } from '@/entities/community'
import { UserAvatar, userHandle } from '@/entities/user'
import { RouterAnchor } from '@/shared/lib'
import { useCommunity } from '../model/useCommunity'
import { useMembersPreview } from '../model/useMembersPreview'
import { CommunityAsideSkeleton, MembersGridSkeleton } from './CommunityAsideSkeleton'
import styles from './community-header.module.css'

/**
 * Right column of a community page, mirroring vk.ru: a «Участники N» card with a 3×2 avatar
 * grid of the first few members and an «Все участники» link to the full list at
 * `/:handle/members`. Same shape as `widgets/profile-card/ui/ProfileAside`'s «Друзья» card.
 */
function CommunityAsideLoaded({ community }: { community: CommunityDto }) {
  const { items: members, isPending } = useMembersPreview(community.id)

  return (
    <Group mode="card">
      <Header
        size="m"
        after={
          members.length > 0 ? (
            <Link Component={RouterAnchor} href={`/${communityHandle(community)}/members`}>
              Все участники
            </Link>
          ) : undefined
        }
      >
        {`Участники ${community.membersCount}`}
      </Header>
      {isPending ? (
        <MembersGridSkeleton />
      ) : members.length === 0 ? (
        <Placeholder title="Пока нет участников" />
      ) : (
        <Box paddingInline="m" paddingBlockEnd="m">
          <div className={styles.membersGrid}>
            {members.map((member) => (
              <Link
                key={member.id}
                Component={RouterAnchor}
                href={`/${userHandle(member)}`}
                className={styles.member}
                noUnderline
              >
                <UserAvatar user={member} size={64} />
                <Caption>{member.firstName}</Caption>
              </Link>
            ))}
          </div>
        </Box>
      )}
    </Group>
  )
}

export function CommunityAside({ handle }: { handle: string }) {
  const { community, isPending, isError } = useCommunity(handle)

  if (isPending) return <CommunityAsideSkeleton />
  if (isError || !community) return null

  return <CommunityAsideLoaded community={community} />
}

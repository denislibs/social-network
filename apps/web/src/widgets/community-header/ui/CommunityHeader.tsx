import { Icon12Dropdown, Icon16Verified } from '@vkontakte/icons'
import {
  Avatar,
  Box,
  Button,
  ButtonGroup,
  CellButton,
  calcInitialsAvatarColor,
  DisplayTitle,
  Flex,
  Footnote,
  Group,
  Popover,
  Snackbar,
} from '@vkontakte/vkui'
import type { CommunityDto } from '@/entities/community'
import { initials, pluralRu, topicLabel } from '@/shared/lib'
import { useCommunity } from '../model/useCommunity'
import { useCommunityMenu } from '../model/useCommunityMenu'
import { CommunityHeaderSkeleton } from './CommunityHeaderSkeleton'
import styles from './community-header.module.css'

const MEMBER_FORMS: [string, string, string] = ['участник', 'участника', 'участников']

/** vk.ru's «Ещё» dropdown, with nothing in it until subsystem 3. */
function MoreButton() {
  return (
    <Popover
      placement="bottom-end"
      content={
        <Box paddingBlock="s">
          <CellButton disabled>Скоро</CellButton>
        </Box>
      }
    >
      <Button mode="secondary" size="m" after={<Icon12Dropdown />}>
        Ещё
      </Button>
    </Popover>
  )
}

/**
 * vk.ru's membership row: a member gets a single «Вы участник» control whose dropdown holds
 * leaving and the notification toggle; a non-member gets «Вступить», «Подписаться» and «Ещё».
 */
function CommunityActions({ community }: { community: CommunityDto }) {
  const menu = useCommunityMenu(community)

  return (
    <>
      <ButtonGroup mode="horizontal" gap="s">
        {menu.isMember ? (
          <Popover
            placement="bottom-end"
            shown={menu.menuShown}
            onShownChange={menu.setMenuShown}
            content={
              <Box paddingBlock="s">
                {menu.menuItems.map((item) => (
                  <CellButton key={item.label} onClick={item.onClick}>
                    {item.label}
                  </CellButton>
                ))}
              </Box>
            }
          >
            <Button mode="secondary" size="m" loading={menu.busy} after={<Icon12Dropdown />}>
              {menu.membershipLabel}
            </Button>
          </Popover>
        ) : (
          <>
            <Button mode="primary" size="m" loading={menu.busy} onClick={menu.join}>
              {menu.membershipLabel}
            </Button>
            <Button mode="secondary" size="m" onClick={menu.follow}>
              {menu.followLabel}
            </Button>
            <MoreButton />
          </>
        )}
      </ButtonGroup>
      {menu.error !== null && <Snackbar onClosed={menu.dismissError}>{menu.error}</Snackbar>}
    </>
  )
}

/**
 * vk.ru's community header, matching `widgets/profile-card/ui/ProfileCard`'s layout so the two
 * look alike side by side: a full-width card (912px, spanning both content columns) with a 200px
 * cover, a 96px avatar overlapping its bottom edge on the left, the name and topic/members line to
 * the right of the avatar, and the membership actions right-aligned on the same row.
 */
function CommunityHeaderLoaded({ community }: { community: CommunityDto }) {
  const [firstWord = '', secondWord = ''] = community.name.trim().split(/\s+/)

  return (
    <Group mode="card" className={styles.card}>
      <Box blockSize={200} className={styles.cover} data-testid="community-cover" />
      <div className={styles.body}>
        <div className={styles.avatar} data-testid="community-avatar">
          <Avatar
            size={96}
            initials={initials(firstWord, secondWord)}
            gradientColor={calcInitialsAvatarColor(community.id)}
          />
        </div>
        <Flex justify="space-between" align="start" gap="m">
          <Flex direction="column" gap="2xs" className={styles.identity}>
            <Flex align="center" gap="xs">
              <DisplayTitle level="2">{community.name}</DisplayTitle>
              {community.isVerified && <Icon16Verified width={16} height={16} />}
            </Flex>
            <Footnote>
              {topicLabel(community.topic)} · {community.membersCount}{' '}
              {pluralRu(community.membersCount, MEMBER_FORMS)}
            </Footnote>
          </Flex>
          <CommunityActions community={community} />
        </Flex>
      </div>
    </Group>
  )
}

export function CommunityHeader({ handle }: { handle: string }) {
  const { community, showSkeleton, isError } = useCommunity(handle)

  if (showSkeleton) return <CommunityHeaderSkeleton />
  if (isError || !community) return null

  return <CommunityHeaderLoaded community={community} />
}

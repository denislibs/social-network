import { Box, Group, Header, Skeleton } from '@vkontakte/vkui'
import styles from './profile-card.module.css'

const CELLS = [0, 1, 2, 3, 4, 5]

/** The 3×2 avatar grid of the «Друзья» card, in skeleton form. */
export function FriendsGridSkeleton() {
  return (
    <Box paddingInline="m" paddingBlockEnd="m" aria-busy="true" aria-label="Загрузка друзей">
      <div className={styles.friendsGrid}>
        {CELLS.map((index) => (
          <div key={index} className={styles.friend}>
            <Skeleton width={64} height={64} borderRadius="50%" />
            <Skeleton width={48} />
          </div>
        ))}
      </div>
    </Box>
  )
}

export function ProfileAsideSkeleton() {
  return (
    <Group mode="card">
      <Header size="m">
        <Skeleton width={120} />
      </Header>
      <FriendsGridSkeleton />
    </Group>
  )
}

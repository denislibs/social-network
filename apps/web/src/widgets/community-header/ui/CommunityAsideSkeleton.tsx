import { Box, Group, Header, Skeleton } from '@vkontakte/vkui'
import styles from './community-header.module.css'

const CELLS = [0, 1, 2, 3, 4, 5]

/** The 3×2 avatar grid of the «Участники» card, in skeleton form. */
export function MembersGridSkeleton() {
  return (
    <Box paddingInline="m" paddingBlockEnd="m" aria-busy="true" aria-label="Загрузка участников">
      <div className={styles.membersGrid}>
        {CELLS.map((index) => (
          <div key={index} className={styles.member}>
            <Skeleton width={64} height={64} borderRadius="50%" />
            <Skeleton width={48} />
          </div>
        ))}
      </div>
    </Box>
  )
}

export function CommunityAsideSkeleton() {
  return (
    <Group mode="card">
      <Header size="m">
        <Skeleton width={120} />
      </Header>
      <MembersGridSkeleton />
    </Group>
  )
}

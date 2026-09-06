import { Box, Flex, Group, Skeleton } from '@vkontakte/vkui'
import styles from './community-header.module.css'

export function CommunityHeaderSkeleton() {
  return (
    <Group mode="card" aria-busy="true" aria-label="Загрузка" className={styles.card}>
      <Box blockSize={200} className={styles.cover}>
        <Skeleton width="100%" height="100%" />
      </Box>
      <div className={styles.body}>
        <div className={styles.avatar}>
          <Skeleton width={96} height={96} borderRadius="50%" />
        </div>
        <Flex direction="column" gap="2xs">
          <Skeleton width={240} height={28} />
          <Skeleton width={160} />
        </Flex>
      </div>
    </Group>
  )
}

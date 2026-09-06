import { Box, Flex, Group, SimpleCell, Skeleton } from '@vkontakte/vkui'

export function ProfileCardSkeleton() {
  return (
    <Group mode="card" aria-busy="true" aria-label="Загрузка">
      <Box blockSize={120}>
        <Skeleton width="100%" height="100%" />
      </Box>
      <Box padding="system">
        <Flex direction="column" gap="m">
          <Skeleton width={96} height={96} borderRadius="50%" />
          <Skeleton width={200} height={28} />
          <Skeleton width={140} />
        </Flex>
      </Box>
      <SimpleCell>
        <Skeleton width={120} />
      </SimpleCell>
      <SimpleCell>
        <Skeleton width={120} />
      </SimpleCell>
      <SimpleCell>
        <Skeleton width={120} />
      </SimpleCell>
    </Group>
  )
}

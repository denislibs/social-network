import { Box, Flex, Group, Skeleton } from '@vkontakte/vkui'

export function CommunityHeaderSkeleton() {
  return (
    <Group mode="card" aria-busy="true" aria-label="Загрузка">
      <Box padding="system">
        <Flex align="center" gap="m">
          <Skeleton width={96} height={96} borderRadius="50%" />
          <Flex direction="column" gap="s">
            <Skeleton width={200} height={24} />
            <Skeleton width={140} />
          </Flex>
        </Flex>
      </Box>
    </Group>
  )
}

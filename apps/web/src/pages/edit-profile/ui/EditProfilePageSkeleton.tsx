import { Box, Flex, Group, Skeleton } from '@vkontakte/vkui'

export function EditProfilePageSkeleton() {
  return (
    <Group mode="card" aria-busy="true" aria-label="Загрузка">
      <Box padding="system">
        <Flex direction="column" gap="m">
          <Skeleton width="100%" height={44} />
          <Skeleton width="100%" height={88} />
          <Skeleton width="100%" height={44} />
          <Skeleton width="100%" height={44} />
          <Skeleton width="100%" height={44} />
        </Flex>
      </Box>
    </Group>
  )
}

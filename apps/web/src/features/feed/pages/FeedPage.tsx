import { Group, Skeleton, Typography } from '@vkc/ui-kit'

export default function FeedPage() {
  return (
    <Group padded>
      <Typography role="title3" as="h1">
        Лента
      </Typography>
      <Typography role="paragraph" muted as="p">
        Лента появится в подсистеме 3. Пока здесь скелетон.
      </Typography>
      <Skeleton height={120} radius={12} />
    </Group>
  )
}

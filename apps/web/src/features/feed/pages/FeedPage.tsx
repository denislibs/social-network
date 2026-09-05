import { Group, Skeleton, Typography } from '@vkc/ui-kit'
import { Show } from 'solid-js'
import { useSession } from '~/shared/session/session'

export default function FeedPage() {
  const { user } = useSession()
  return (
    <Group padded>
      <Show when={user()?.firstName}>
        {(firstName) => (
          <Typography role="headline" as="p">
            Здравствуйте, {firstName()}
          </Typography>
        )}
      </Show>
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

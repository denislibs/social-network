import { Box, Group, Header, Panel, Placeholder, Title } from '@vkontakte/vkui'
import { useSession } from '@/entities/session'

/**
 * vk.ru has no centred page title above the feed — the column starts straight with content —
 * so this page is just the greeting card. A `PanelHeader` here read as a mobile screen title.
 */
export function FeedPage() {
  const { user } = useSession()

  return (
    <Panel>
      <Group mode="card">
        <Header>Лента</Header>
        <Box padding="system">
          <Title level="2">Здравствуйте, {user?.firstName}</Title>
        </Box>
        <Placeholder title="Лента скоро">Появится в подсистеме 3.</Placeholder>
      </Group>
    </Panel>
  )
}

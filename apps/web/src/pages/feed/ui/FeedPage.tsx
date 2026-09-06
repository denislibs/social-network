import { Box, Group, Panel, PanelHeader, Placeholder, Title } from '@vkontakte/vkui'
import { useSession } from '@/entities/session'

export function FeedPage() {
  const { user } = useSession()

  return (
    <Panel>
      <PanelHeader>Лента</PanelHeader>
      <Group mode="card">
        <Box padding="system">
          <Title level="2">Здравствуйте, {user?.firstName}</Title>
        </Box>
        <Placeholder title="Лента скоро">Появится в подсистеме 3.</Placeholder>
      </Group>
    </Panel>
  )
}

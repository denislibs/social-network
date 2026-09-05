import { Div, Group, Panel, PanelHeader, Placeholder, Title } from '@vkontakte/vkui'
import { useSession } from '@/entities/session'

export function FeedPage() {
  const { user } = useSession()

  return (
    <Panel>
      <PanelHeader>Лента</PanelHeader>
      <Group mode="card">
        <Div>
          <Title level="2">Здравствуйте, {user?.firstName}</Title>
        </Div>
        <Placeholder title="Лента скоро">Появится в подсистеме 3.</Placeholder>
      </Group>
    </Panel>
  )
}

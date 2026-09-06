import { Group, Panel, PanelHeader, Placeholder } from '@vkontakte/vkui'

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <Panel>
      <PanelHeader>{title}</PanelHeader>
      <Group mode="card">
        <Placeholder title="Раздел скоро откроется">
          {title} появится в одной из следующих подсистем.
        </Placeholder>
      </Group>
    </Panel>
  )
}

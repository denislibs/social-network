import { Group, Panel, Placeholder } from '@vkontakte/vkui'

export function HandleNotFound() {
  return (
    <Panel>
      <Group mode="card">
        <Placeholder title="Страница не найдена">Проверьте адрес.</Placeholder>
      </Group>
    </Panel>
  )
}

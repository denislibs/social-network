import { Group, Panel, Placeholder } from '@vkontakte/vkui'

export function NotFoundPage() {
  return (
    <Panel>
      <Group mode="card">
        <Placeholder title="Страница не найдена">
          Проверьте адрес или вернитесь в ленту.
        </Placeholder>
      </Group>
    </Panel>
  )
}

import { Icon24Add } from '@vkontakte/icons'
import { Box, Button, Group, Placeholder, Tabs, TabsItem } from '@vkontakte/vkui'

/**
 * Left (551px) column of the profile: the "create a post" card and the wall, exactly the two
 * blocks vk.ru puts under the profile header. The header itself and the right column are slots
 * of `AppShell`, filled by `app/routes/HandleRoute` — on vk.ru the header spans both columns.
 */
export function ProfilePage() {
  return (
    <>
      <Group mode="card">
        <Box padding="m">
          <Button mode="tertiary" before={<Icon24Add />} align="left" stretched disabled>
            Создать пост
          </Button>
        </Box>
      </Group>
      <Group mode="card">
        <Tabs mode="secondary">
          <TabsItem id="wall-main" selected>
            Главная
          </TabsItem>
          <TabsItem id="wall-all" disabled>
            Все записи
          </TabsItem>
          <TabsItem id="wall-mine" disabled>
            Мои записи
          </TabsItem>
        </Tabs>
        <Placeholder title="Записей пока нет">Стена появится в подсистеме 3.</Placeholder>
      </Group>
    </>
  )
}

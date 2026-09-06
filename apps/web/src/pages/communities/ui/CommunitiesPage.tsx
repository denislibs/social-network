import { Panel, PanelHeader, Tabs, TabsItem } from '@vkontakte/vkui'
import { CommunitiesList } from '@/widgets/communities-list'

export function CommunitiesPage() {
  return (
    <Panel>
      <PanelHeader>Сообщества</PanelHeader>
      <Tabs>
        <TabsItem id="mine" selected>
          Мои
        </TabsItem>
      </Tabs>
      <CommunitiesList />
    </Panel>
  )
}

import { Panel, PanelHeader } from '@vkontakte/vkui'
import { NotificationsList } from '@/widgets/notifications-list'

export function NotificationsPage() {
  return (
    <Panel>
      <PanelHeader>Уведомления</PanelHeader>
      <NotificationsList />
    </Panel>
  )
}

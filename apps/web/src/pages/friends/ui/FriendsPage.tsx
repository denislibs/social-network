import { Panel, PanelHeader, Tabs, TabsItem } from '@vkontakte/vkui'
import { useSession } from '@/entities/session'
import { FriendRequests } from '@/widgets/friend-requests'
import { FriendsList } from '@/widgets/friends-list'
import { PymkBlock } from '@/widgets/pymk-block'
import { FRIENDS_TABS, useFriendsTab } from '../model/useFriendsTab'

export function FriendsPage() {
  const { user } = useSession()
  const { tab, setTab } = useFriendsTab()

  return (
    <Panel>
      <PanelHeader>Друзья</PanelHeader>
      <Tabs mode="secondary">
        {FRIENDS_TABS.map((t) => (
          <TabsItem key={t.id} id={t.id} selected={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </TabsItem>
        ))}
      </Tabs>
      {tab === 'all' && user && <FriendsList userId={user.id} />}
      {tab === 'requests' && <FriendRequests />}
      {tab === 'suggestions' && <PymkBlock />}
    </Panel>
  )
}

import { Panel, PanelHeader, Tabs, TabsItem } from '@vkontakte/vkui'
import { useSearchParams } from 'react-router'
import { useSession } from '@/entities/session'
import { FriendRequests } from '@/widgets/friend-requests'
import { FriendsList } from '@/widgets/friends-list'
import { PymkBlock } from '@/widgets/pymk-block'

type Tab = 'all' | 'requests' | 'suggestions'

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'requests', label: 'Заявки' },
  { id: 'suggestions', label: 'Рекомендации' },
]

function parseTab(value: string | null): Tab {
  return value === 'requests' || value === 'suggestions' ? value : 'all'
}

export function FriendsPage() {
  const { user } = useSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseTab(searchParams.get('tab'))

  return (
    <Panel>
      <PanelHeader>Друзья</PanelHeader>
      <Tabs>
        {TABS.map((t) => (
          <TabsItem
            key={t.id}
            id={t.id}
            selected={tab === t.id}
            onClick={() => setSearchParams(t.id === 'all' ? {} : { tab: t.id })}
          >
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

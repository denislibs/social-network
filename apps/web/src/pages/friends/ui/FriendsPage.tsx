import { Counter, Group, Panel, Tabs, TabsItem } from '@vkontakte/vkui'
import { useSession } from '@/entities/session'
import { useFriendsBadge } from '@/widgets/app-shell'
import { FriendRequests } from '@/widgets/friend-requests'
import { FriendsList } from '@/widgets/friends-list'
import { PymkBlock } from '@/widgets/pymk-block'
import { FRIENDS_TABS, useFriendsTab } from '../model/useFriendsTab'

export function FriendsPage() {
  const { user } = useSession()
  const { tab, setTab } = useFriendsTab()
  // Same counters cache entry the nav badge reads (`queryKeys.user.counters`), so the tab
  // counter costs no extra request and stays in step with the badge after every friend action.
  const { count: incoming } = useFriendsBadge()

  return (
    <Panel>
      <Group mode="card">
        <Tabs mode="secondary">
          {FRIENDS_TABS.map((t) => (
            <TabsItem
              key={t.id}
              id={t.id}
              selected={tab === t.id}
              onClick={() => setTab(t.id)}
              status={
                t.id === 'requests' && incoming > 0 ? (
                  <Counter mode="primary" appearance="neutral" size="s">
                    {incoming}
                  </Counter>
                ) : undefined
              }
            >
              {t.label}
            </TabsItem>
          ))}
        </Tabs>
      </Group>
      {tab === 'all' && user && <FriendsList userId={user.id} />}
      {tab === 'requests' && <FriendRequests />}
      {tab === 'suggestions' && <PymkBlock />}
    </Panel>
  )
}

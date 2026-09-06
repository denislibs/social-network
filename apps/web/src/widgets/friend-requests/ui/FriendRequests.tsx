import { Group, Placeholder, Tabs, TabsItem } from '@vkontakte/vkui'
import { useState } from 'react'
import { UserCell } from '@/entities/user'
import { FriendButton } from '@/features/friendship'
import { useFriendRequests } from '../model/useFriendRequests'
import { FriendRequestsSkeleton } from './FriendRequestsSkeleton'

const TABS = [
  { id: 'incoming', label: 'Входящие' },
  { id: 'outgoing', label: 'Исходящие' },
] as const

export function FriendRequests() {
  const [dir, setDir] = useState<(typeof TABS)[number]['id']>('incoming')
  const { items, isPending, showSkeleton, isError } = useFriendRequests(dir)

  return (
    <Group mode="card">
      <Tabs>
        {TABS.map((tab) => (
          <TabsItem
            key={tab.id}
            id={tab.id}
            selected={dir === tab.id}
            onClick={() => setDir(tab.id)}
          >
            {tab.label}
          </TabsItem>
        ))}
      </Tabs>
      {showSkeleton ? (
        <FriendRequestsSkeleton />
      ) : isPending ? null : isError ? (
        <Placeholder title="Не удалось загрузить заявки" />
      ) : items.length === 0 ? (
        <Placeholder title={dir === 'incoming' ? 'Нет входящих заявок' : 'Нет исходящих заявок'} />
      ) : (
        items.map((user) => (
          <UserCell
            key={user.id}
            user={user}
            after={<FriendButton userId={user.id} relation={dir} />}
          />
        ))
      )}
    </Group>
  )
}

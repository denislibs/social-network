import { Group, Header, Placeholder, SimpleCell, Skeleton } from '@vkontakte/vkui'
import { CommunityCell } from '@/entities/community'
import { UserCell } from '@/entities/user'
import type { SearchKind } from '../model/useSearch'
import { useSearch } from '../model/useSearch'

function ResultsSkeleton() {
  return (
    <Group mode="card" aria-busy="true" aria-label="Загрузка">
      {Array.from({ length: 5 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder rows, never reordered
        <SimpleCell key={i} before={<Skeleton width={48} height={48} borderRadius="50%" />}>
          <Skeleton width={160} />
        </SimpleCell>
      ))}
    </Group>
  )
}

export function SearchResults({ q, kind }: { q: string; kind: SearchKind }) {
  const { users, communities, isPending, enabled } = useSearch(q, kind)

  if (!enabled) {
    return (
      <Group mode="card">
        <Placeholder>Введите минимум 2 символа</Placeholder>
      </Group>
    )
  }

  if (isPending) return <ResultsSkeleton />

  const showUsers = kind !== 'communities'
  const showCommunities = kind !== 'users'
  const nothingFound = users.length === 0 && communities.length === 0

  if (nothingFound) {
    return (
      <Group mode="card">
        <Placeholder>Ничего не найдено</Placeholder>
      </Group>
    )
  }

  return (
    <>
      {showUsers && users.length > 0 && (
        <Group mode="card">
          <Header>Люди</Header>
          {users.map((user) => (
            <UserCell key={user.id} user={user} />
          ))}
        </Group>
      )}
      {showCommunities && communities.length > 0 && (
        <Group mode="card">
          <Header>Сообщества</Header>
          {communities.map((community) => (
            <CommunityCell key={community.id} community={community} />
          ))}
        </Group>
      )}
    </>
  )
}

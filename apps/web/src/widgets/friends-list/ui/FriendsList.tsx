import { Button, Group, Header, Placeholder, Search } from '@vkontakte/vkui'
import { UserCell } from '@/entities/user'
import { useFriendsFilter } from '../model/useFriendsFilter'
import { useFriendsList } from '../model/useFriendsList'
import { FriendsListSkeleton } from './FriendsListSkeleton'

export function FriendsList({ userId }: { userId: number }) {
  const { items, isPending, showSkeleton, isError, hasNextPage, fetchNextPage } =
    useFriendsList(userId)
  const { query, setQuery, filtered } = useFriendsFilter(items)

  return (
    <Group mode="card">
      <Header>Друзья</Header>
      {showSkeleton ? (
        <FriendsListSkeleton />
      ) : isPending ? null : isError ? (
        <Placeholder title="Не удалось загрузить друзей" />
      ) : items.length === 0 ? (
        <Placeholder title="Пока нет друзей" />
      ) : (
        <>
          <Search
            value={query}
            placeholder="Введите запрос"
            onChange={(event) => setQuery(event.target.value)}
          />
          {filtered.length === 0 ? (
            <Placeholder title="Никого не найдено" />
          ) : (
            filtered.map((user) => <UserCell key={user.id} user={user} />)
          )}
          {hasNextPage && (
            <Button mode="tertiary" stretched onClick={fetchNextPage}>
              Показать ещё
            </Button>
          )}
        </>
      )}
    </Group>
  )
}

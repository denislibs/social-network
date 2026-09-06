import { Button, Group, Header, Placeholder } from '@vkontakte/vkui'
import { UserCell } from '@/entities/user'
import { useFriendsList } from '../model/useFriendsList'
import { FriendsListSkeleton } from './FriendsListSkeleton'

export function FriendsList({ userId }: { userId: number }) {
  const { items, isPending, isError, hasNextPage, fetchNextPage } = useFriendsList(userId)

  return (
    <Group mode="card">
      <Header>Друзья</Header>
      {isPending ? (
        <FriendsListSkeleton />
      ) : isError ? (
        <Placeholder title="Не удалось загрузить друзей" />
      ) : items.length === 0 ? (
        <Placeholder title="Пока нет друзей" />
      ) : (
        <>
          {items.map((user) => (
            <UserCell key={user.id} user={user} />
          ))}
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

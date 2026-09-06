import { Button, Group, Header, Placeholder } from '@vkontakte/vkui'
import { UserCell } from '@/entities/user'
import { useCommunityMembers } from '../model/useCommunityMembers'
import { CommunityMembersSkeleton } from './CommunityMembersSkeleton'

export function CommunityMembers({ id }: { id: number }) {
  const { items, isPending, showSkeleton, isError, hasNextPage, fetchNextPage } =
    useCommunityMembers(id)

  return (
    <Group mode="card">
      <Header>Участники</Header>
      {showSkeleton ? (
        <CommunityMembersSkeleton />
      ) : isPending ? null : isError ? (
        <Placeholder title="Не удалось загрузить участников" />
      ) : items.length === 0 ? (
        <Placeholder title="Пока нет участников" />
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

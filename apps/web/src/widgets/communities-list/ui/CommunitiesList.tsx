import { Group, Header, Placeholder } from '@vkontakte/vkui'
import { CommunityCell } from '@/entities/community'
import { useMyCommunities } from '../model/useMyCommunities'
import { CommunitiesListSkeleton } from './CommunitiesListSkeleton'

export function CommunitiesList() {
  const { items, isPending, isError } = useMyCommunities()

  return (
    <Group mode="card">
      <Header>Мои сообщества</Header>
      {isPending ? (
        <CommunitiesListSkeleton />
      ) : isError ? (
        <Placeholder title="Не удалось загрузить сообщества" />
      ) : items.length === 0 ? (
        <Placeholder title="Пока нет сообществ" />
      ) : (
        items.map((community) => <CommunityCell key={community.id} community={community} />)
      )}
    </Group>
  )
}

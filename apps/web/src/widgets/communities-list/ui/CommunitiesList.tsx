import { Group, Header, Placeholder } from '@vkontakte/vkui'
import { CommunityCell } from '@/entities/community'
import { useMyCommunities } from '../model/useMyCommunities'
import { CommunitiesListSkeleton } from './CommunitiesListSkeleton'

export function CommunitiesList() {
  const { items, isPending, showSkeleton, isError } = useMyCommunities()

  return (
    <Group mode="card">
      <Header>Мои сообщества</Header>
      {showSkeleton ? (
        <CommunitiesListSkeleton />
      ) : isPending ? null : isError ? (
        <Placeholder title="Не удалось загрузить сообщества" />
      ) : items.length === 0 ? (
        <Placeholder title="Пока нет сообществ" />
      ) : (
        items.map((community) => <CommunityCell key={community.id} community={community} />)
      )}
    </Group>
  )
}

import { Group, Header } from '@vkontakte/vkui'
import { SuggestionCardSkeleton } from '@/features/suggestions'

export function PymkBlockSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Group mode="card">
      <Header>Возможно, вы знакомы</Header>
      <SuggestionCardSkeleton rows={rows} />
    </Group>
  )
}

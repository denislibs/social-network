import { Group, Header, Link, Placeholder } from '@vkontakte/vkui'
import { FriendButton } from '@/features/friendship'
import { SuggestionCard, useSuggestions } from '@/features/suggestions'
import { RouterAnchor } from '@/shared/lib'
import { PymkBlockSkeleton } from './PymkBlockSkeleton'

export function PymkBlock({ compact = false }: { compact?: boolean }) {
  const { items, isPending, isError } = useSuggestions()
  const visible = compact ? items.slice(0, 3) : items
  const showAllLink = compact && !isPending && !isError && visible.length > 0

  if (isPending) return <PymkBlockSkeleton rows={compact ? 3 : 8} />

  return (
    <Group mode="card">
      <Header
        after={
          showAllLink ? (
            <Link Component={RouterAnchor} href="/friends?tab=suggestions">
              Показать всех
            </Link>
          ) : undefined
        }
      >
        Возможно, вы знакомы
      </Header>
      {isError || visible.length === 0 ? (
        <Placeholder title="Пока некого предложить" />
      ) : (
        visible.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            friendAction={<FriendButton userId={suggestion.id} relation="none" />}
          />
        ))
      )}
    </Group>
  )
}

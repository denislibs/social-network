import { Group, Header, Link, Placeholder } from '@vkontakte/vkui'
import { FriendButton } from '@/features/friendship'
import { SuggestionCard, SuggestionCardSkeleton, useSuggestions } from '@/features/suggestions'
import { RouterAnchor } from '@/shared/lib'

export function PymkBlock({ compact = false }: { compact?: boolean }) {
  const { items, isPending, isError } = useSuggestions()
  const visible = compact ? items.slice(0, 3) : items
  const showAllLink = compact && !isPending && !isError && visible.length > 0

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
      {isPending ? (
        <SuggestionCardSkeleton rows={compact ? 3 : 8} />
      ) : isError || visible.length === 0 ? (
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

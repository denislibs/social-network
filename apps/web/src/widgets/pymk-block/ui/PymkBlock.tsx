import { Box, Button, Group, Header, Placeholder } from '@vkontakte/vkui'
import type { SuggestionDto } from '@/entities/user'
import { FriendButton } from '@/features/friendship'
import { SuggestionCard, useSuggestions } from '@/features/suggestions'
import { RouterAnchor } from '@/shared/lib'
import { useSuggestionRelation } from '../model/useSuggestionRelation'
import { PymkBlockSkeleton } from './PymkBlockSkeleton'

/**
 * One row per suggestion, in its own component: `useSuggestionRelation` is a hook, and the
 * relation differs per suggestion, so it cannot be called from inside the `.map()` below —
 * each row needs its own hook call, which means its own component.
 */
function PymkSuggestionRow({ suggestion }: { suggestion: SuggestionDto }) {
  const relation = useSuggestionRelation(suggestion.id)
  return (
    <SuggestionCard
      suggestion={suggestion}
      friendAction={<FriendButton userId={suggestion.id} relation={relation} variant="icon" />}
    />
  )
}

/**
 * vk.ru's «Возможно, вы знакомы» card: a plain header, compact cells with icon actions, and a
 * stretched secondary «Показать всех» button closing the card off — not a link tucked into the
 * header, which is what the block used to have.
 */
export function PymkBlock({ compact = false }: { compact?: boolean }) {
  const { items, isPending, showSkeleton, isError } = useSuggestions()
  const visible = compact ? items.slice(0, 3) : items
  const showAll = compact && !isPending && !isError && visible.length > 0

  if (showSkeleton) return <PymkBlockSkeleton rows={compact ? 3 : 8} />
  // In flight but under the skeleton delay: nothing, never the empty placeholder.
  if (isPending) return null

  return (
    <Group mode="card">
      <Header>Возможно, вы знакомы</Header>
      {isError || visible.length === 0 ? (
        <Placeholder title="Пока некого предложить" />
      ) : (
        <>
          {visible.map((suggestion) => (
            <PymkSuggestionRow key={suggestion.id} suggestion={suggestion} />
          ))}
          {showAll && (
            <Box paddingInline="m" paddingBlockStart="s" paddingBlockEnd="m">
              <Button
                mode="secondary"
                size="m"
                stretched
                Component={RouterAnchor}
                href="/friends?tab=suggestions"
              >
                Показать всех
              </Button>
            </Box>
          )}
        </>
      )}
    </Group>
  )
}

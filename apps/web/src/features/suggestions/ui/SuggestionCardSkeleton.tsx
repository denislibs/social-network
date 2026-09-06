import { Group, RichCell, Skeleton } from '@vkontakte/vkui'

export function SuggestionCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Group mode="plain" aria-busy="true" aria-label="Загрузка">
      {Array.from({ length: rows }, (_, i) => (
        <RichCell
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder rows, never reordered
          key={i}
          before={<Skeleton width={48} height={48} borderRadius="50%" />}
          subtitle={<Skeleton width={100} />}
        >
          <Skeleton width={160} />
        </RichCell>
      ))}
    </Group>
  )
}

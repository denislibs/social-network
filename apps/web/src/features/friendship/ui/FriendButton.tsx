import { Button, ButtonGroup, Snackbar } from '@vkontakte/vkui'
import type { Relation } from '@/entities/user'
import { useFriendAction } from '../model/useFriendAction'

type Props = {
  userId: number
  relation: Relation
}

export function FriendButton({ userId, relation }: Props) {
  const { primary, secondary, busy, error, dismissError } = useFriendAction(userId, relation)

  if (!primary) return null

  return (
    <>
      <ButtonGroup mode="horizontal" gap="s">
        <Button
          mode={primary.mode}
          size="s"
          loading={busy}
          disabled={primary.disabled}
          onClick={primary.onClick}
        >
          {primary.label}
        </Button>
        {secondary && (
          <Button mode="tertiary" size="s" disabled={busy} onClick={secondary.onClick}>
            {secondary.label}
          </Button>
        )}
      </ButtonGroup>
      {error !== null && <Snackbar onClosed={dismissError}>{error}</Snackbar>}
    </>
  )
}

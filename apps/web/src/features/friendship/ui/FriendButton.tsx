import {
  Icon24CheckCircleOutline,
  Icon24DoneOutline,
  Icon24UserAddedOutline,
  Icon24UserAddOutline,
} from '@vkontakte/icons'
import { Button, ButtonGroup, IconButton, Snackbar } from '@vkontakte/vkui'
import type { ComponentType } from 'react'
import type { Relation } from '@/entities/user'
import { useFriendAction } from '../model/useFriendAction'

type Props = {
  userId: number
  relation: Relation
  /**
   * `'button'` (default) is the profile-header pair of labelled buttons. `'icon'` is vk.ru's
   * compact list form — one 24px icon button carrying the primary action, with the label moved
   * to `aria-label` — used in the «Возможно, вы знакомы» rows, where a blue "Добавить в друзья"
   * button would dominate the card.
   */
  variant?: 'button' | 'icon'
}

/** Which icon stands in for the primary action's label in the compact variant. */
const RELATION_ICON: Record<Relation, ComponentType<{ width?: number; height?: number }>> = {
  none: Icon24UserAddOutline,
  incoming: Icon24DoneOutline,
  outgoing: Icon24CheckCircleOutline,
  friends: Icon24UserAddedOutline,
  self: Icon24UserAddOutline,
}

export function FriendButton({ userId, relation, variant = 'button' }: Props) {
  const { primary, secondary, busy, error, dismissError } = useFriendAction(userId, relation)

  if (!primary) return null

  const Icon = RELATION_ICON[relation]

  return (
    <>
      {variant === 'icon' ? (
        <IconButton
          label={primary.label}
          disabled={primary.disabled || busy}
          onClick={primary.onClick}
        >
          <Icon />
        </IconButton>
      ) : (
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
      )}
      {error !== null && <Snackbar onClosed={dismissError}>{error}</Snackbar>}
    </>
  )
}

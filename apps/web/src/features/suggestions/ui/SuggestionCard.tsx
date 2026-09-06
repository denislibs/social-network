import { Icon24Cancel } from '@vkontakte/icons'
import { ButtonGroup, IconButton, SimpleCell } from '@vkontakte/vkui'
import type { MouseEvent, ReactNode } from 'react'
import { type SuggestionDto, UserAvatar, userHandle } from '@/entities/user'
import { pluralRu, RouterAnchor } from '@/shared/lib'
import { useHideSuggestion } from '../model/useHideSuggestion'

const MUTUAL_FORMS: [string, string, string] = ['общий друг', 'общих друга', 'общих друзей']

function caption(s: SuggestionDto): string | undefined {
  if (s.mutual > 0) return `${s.mutual} ${pluralRu(s.mutual, MUTUAL_FORMS)}`
  if (s.sameCity) return 'Из вашего города'
  return undefined
}

/** The whole row is a link to the profile, so a click on one of the action buttons inside it
 * must not also navigate there. */
function keepInsideTheRow(event: MouseEvent): void {
  event.stopPropagation()
  event.preventDefault()
}

type Props = {
  suggestion: SuggestionDto
  /**
   * The friend-request action for this suggestion, e.g. `<FriendButton userId={suggestion.id}
   * relation="none" variant="icon" />`. Passed in rather than imported here: FSD forbids a
   * same-layer `features/suggestions` -> `features/friendship` import (checked by `steiger`), so
   * composing the two features together is a job for whichever widget/page renders this card.
   */
  friendAction?: ReactNode
}

/**
 * One «Возможно, вы знакомы» row, shaped like vk.ru's: a compact `SimpleCell` linking to the
 * profile — avatar, name, «N общих друзей» — with the actions as right-aligned icon buttons.
 * Deliberately no primary blue button: the block is a sidebar suggestion, not a call to action.
 */
export function SuggestionCard({ suggestion, friendAction }: Props) {
  const { hide } = useHideSuggestion()

  return (
    <SimpleCell
      Component={RouterAnchor}
      href={`/${userHandle(suggestion)}`}
      before={<UserAvatar user={suggestion} size={48} />}
      subtitle={caption(suggestion)}
      after={
        <ButtonGroup mode="horizontal" gap="s" onClick={keepInsideTheRow}>
          {friendAction}
          <IconButton label="Скрыть" onClick={() => hide(suggestion.id)}>
            <Icon24Cancel />
          </IconButton>
        </ButtonGroup>
      }
    >
      {suggestion.firstName} {suggestion.lastName}
    </SimpleCell>
  )
}

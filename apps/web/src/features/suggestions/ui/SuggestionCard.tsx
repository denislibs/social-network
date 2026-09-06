import { Icon24Cancel } from '@vkontakte/icons'
import { IconButton, RichCell } from '@vkontakte/vkui'
import type { ReactNode } from 'react'
import { type SuggestionDto, UserAvatar, userHandle } from '@/entities/user'
import { pluralRu, RouterAnchor } from '@/shared/lib'
import { useHideSuggestion } from '../model/useHideSuggestion'

const MUTUAL_FORMS: [string, string, string] = ['общий друг', 'общих друга', 'общих друзей']

function caption(s: SuggestionDto): string | undefined {
  if (s.mutual > 0) return `${s.mutual} ${pluralRu(s.mutual, MUTUAL_FORMS)}`
  if (s.sameCity) return 'Из вашего города'
  return undefined
}

type Props = {
  suggestion: SuggestionDto
  /**
   * The friend-request action for this suggestion, e.g. `<FriendButton userId={suggestion.id}
   * relation="none" />`. Passed in rather than imported here: FSD forbids a same-layer
   * `features/suggestions` -> `features/friendship` import (checked by `steiger`), so composing
   * the two features together is a job for whichever widget/page renders this card.
   */
  friendAction?: ReactNode
}

export function SuggestionCard({ suggestion, friendAction }: Props) {
  const { hide } = useHideSuggestion()

  return (
    <RichCell
      before={<UserAvatar user={suggestion} size={48} />}
      subtitle={caption(suggestion)}
      actions={
        <>
          {friendAction}
          <IconButton label="Скрыть" onClick={() => hide(suggestion.id)}>
            <Icon24Cancel />
          </IconButton>
        </>
      }
    >
      <RouterAnchor href={`/${userHandle(suggestion)}`}>
        {suggestion.firstName} {suggestion.lastName}
      </RouterAnchor>
    </RichCell>
  )
}

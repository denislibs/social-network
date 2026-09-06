import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import type { Relation } from '@/entities/user'
import { useService } from '@/shared/di'
import { queryKeys } from '@/shared/lib'
import { codeOf, messageFor } from './errors'
import { FRIENDSHIP_GATEWAY } from './ports'

type Action = 'request' | 'accept' | 'decline' | 'remove'

/** The relation each action optimistically settles on, before the server confirms it. */
const OPTIMISTIC: Record<Action, Relation> = {
  request: 'outgoing',
  accept: 'friends',
  decline: 'none',
  remove: 'none',
}

type ButtonSpec = {
  label: string
  mode: 'primary' | 'secondary' | 'tertiary'
  onClick(): void
  disabled?: boolean
}

/** Bumps every cache the friend-graph mutation can affect, without needing to know "me"'s id:
 * matches `queryKeys.user.counters(*)`, `queryKeys.user.friends(*)`, `queryKeys.user.requests(*)`
 * and `queryKeys.user.profile(*)` (whose key tuples start with 'counters'/'friends'/'requests'/
 * 'user' respectively) by predicate instead of by exact key. Also invalidates
 * `queryKeys.user.suggestions` (key `['suggestions']`, not matched by any of those prefixes) so
 * `PymkBlock` drops a suggestion once its relation moves away from `'none'` on refetch — see the
 * `pymk-block` fix that stopped hardcoding `relation="none"` on `FriendButton`. */
function invalidateAffected(queryClient: ReturnType<typeof useQueryClient>): void {
  const byFirstKey = (tag: string) =>
    queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === tag })
  byFirstKey('counters')
  byFirstKey('friends')
  byFirstKey('requests')
  byFirstKey('user')
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread })
  queryClient.invalidateQueries({ queryKey: queryKeys.user.suggestions })
}

export function useFriendAction(
  userId: number,
  relation: Relation,
): {
  primary: ButtonSpec | null
  secondary: { label: string; onClick(): void } | undefined
  busy: boolean
  error: string | null
  dismissError(): void
} {
  const gateway = useService(FRIENDSHIP_GATEWAY)
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const relationKey = queryKeys.user.relation(userId)

  const mutation = useMutation<Relation, unknown, Action, { previous: Relation | undefined }>({
    mutationFn: (action) => {
      switch (action) {
        case 'request':
          return gateway.request(userId)
        case 'accept':
          return gateway.accept(userId)
        case 'decline':
          return gateway.decline(userId)
        case 'remove':
          return gateway.remove(userId)
      }
    },
    onMutate: async (action) => {
      setError(null)
      await queryClient.cancelQueries({ queryKey: relationKey })
      const previous = queryClient.getQueryData<Relation>(relationKey) ?? relation
      queryClient.setQueryData(relationKey, OPTIMISTIC[action])
      return { previous }
    },
    onError: (err, _action, context) => {
      queryClient.setQueryData(relationKey, context?.previous ?? relation)
      setError(messageFor(codeOf(err)))
    },
    onSuccess: (serverRelation) => {
      queryClient.setQueryData(relationKey, serverRelation)
      invalidateAffected(queryClient)
    },
  })

  const act = useCallback((action: Action) => mutation.mutate(action), [mutation])
  const dismissError = useCallback(() => setError(null), [])
  const busy = mutation.isPending

  let primary: ButtonSpec | null
  let secondary: { label: string; onClick(): void } | undefined

  switch (relation) {
    case 'none':
      primary = { label: 'Добавить в друзья', mode: 'primary', onClick: () => act('request') }
      break
    case 'outgoing':
      primary = {
        label: 'Заявка отправлена',
        mode: 'secondary',
        onClick: () => {},
        disabled: true,
      }
      secondary = { label: 'Отменить заявку', onClick: () => act('remove') }
      break
    case 'incoming':
      primary = { label: 'Принять', mode: 'primary', onClick: () => act('accept') }
      secondary = { label: 'Отклонить', onClick: () => act('decline') }
      break
    case 'friends':
      primary = { label: 'У вас в друзьях', mode: 'secondary', onClick: () => {}, disabled: true }
      secondary = { label: 'Удалить из друзей', onClick: () => act('remove') }
      break
    case 'self':
      primary = null
      break
  }

  return { primary, secondary, busy, error, dismissError }
}

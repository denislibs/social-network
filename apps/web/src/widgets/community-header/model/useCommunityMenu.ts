import { useCallback, useState } from 'react'
import type { CommunityDto } from '@/entities/community'
import { useFollowCommunity, useJoinCommunity } from '@/features/community-membership'

type MenuItem = { label: string; onClick(): void }

/**
 * The community header's action row, as vk.ru arranges it: a member sees exactly one control —
 * «Вы участник» with a dropdown that holds leaving and the notification toggle — while a
 * non-member sees «Вступить» plus «Подписаться». Composing the two membership hooks and the
 * dropdown's open state here keeps `CommunityHeader` a plain view.
 */
export function useCommunityMenu(community: CommunityDto): {
  isMember: boolean
  busy: boolean
  /** «Вступить» for a non-member, «Вы участник» (the dropdown trigger) for a member. */
  membershipLabel: string
  join(): void
  followLabel: string
  follow(): void
  menuShown: boolean
  setMenuShown(shown: boolean): void
  menuItems: MenuItem[]
  error: string | null
  dismissError(): void
} {
  const joinAction = useJoinCommunity(community)
  const followAction = useFollowCommunity(community)
  const [menuShown, setMenuShown] = useState(false)

  const isMember = community.membership !== 'none'
  const leave = joinAction.secondary?.onClick

  // Every item closes the dropdown before acting, so the menu never lingers over the row it
  // just changed.
  const runAndClose = useCallback((run: (() => void) | undefined) => {
    return () => {
      setMenuShown(false)
      run?.()
    }
  }, [])

  const menuItems: MenuItem[] = [
    {
      label: community.isFollowing ? 'Отписаться от уведомлений' : 'Подписаться на уведомления',
      onClick: runAndClose(followAction.onClick),
    },
    { label: 'Выйти из сообщества', onClick: runAndClose(leave) },
  ]

  // A plain closure, not `useCallback`: it is only ever called from the Snackbar's `onClosed`,
  // never passed as an effect/memo dependency.
  const dismissError = () => {
    joinAction.dismissError()
    followAction.dismissError()
  }

  return {
    isMember,
    busy: joinAction.busy || followAction.busy,
    membershipLabel: joinAction.label,
    join: joinAction.onClick,
    followLabel: followAction.label,
    follow: followAction.onClick,
    menuShown,
    setMenuShown,
    menuItems,
    error: joinAction.error ?? followAction.error,
    dismissError,
  }
}

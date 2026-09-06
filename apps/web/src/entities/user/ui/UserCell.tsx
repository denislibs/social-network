import { Icon16Verified } from '@vkontakte/icons'
import { Link, SimpleCell } from '@vkontakte/vkui'
import type { ReactNode } from 'react'
import { RouterAnchor } from '@/shared/lib'
import { userHandle } from '../model/handle'
import type { UserCellDto } from '../model/types'
import { UserAvatar } from './UserAvatar'

type Props = {
  user: UserCellDto
  after?: ReactNode
  subtitle?: string
}

/**
 * The row itself is a plain, non-interactive `div` — only the name is a link. That way `after`
 * (e.g. accept/decline `FriendButton`s) sits next to the link instead of nested inside it, so a
 * click on `after` never also triggers navigation to the profile.
 */
export function UserCell({ user, after, subtitle }: Props) {
  return (
    <SimpleCell
      Component="div"
      before={<UserAvatar user={user} size={48} />}
      subtitle={subtitle ?? user.city ?? undefined}
      after={after}
      badgeAfterTitle={user.isVerified ? <Icon16Verified width={16} height={16} /> : undefined}
    >
      <Link Component={RouterAnchor} href={`/${userHandle(user)}`}>
        {user.firstName} {user.lastName}
      </Link>
    </SimpleCell>
  )
}

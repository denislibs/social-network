import { Icon16Verified } from '@vkontakte/icons'
import { SimpleCell } from '@vkontakte/vkui'
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

export function UserCell({ user, after, subtitle }: Props) {
  return (
    <SimpleCell
      Component={RouterAnchor}
      href={`/${userHandle(user)}`}
      before={<UserAvatar user={user} size={48} />}
      subtitle={subtitle ?? user.city ?? undefined}
      after={after}
      badgeAfterTitle={user.isVerified ? <Icon16Verified width={16} height={16} /> : undefined}
    >
      {user.firstName} {user.lastName}
    </SimpleCell>
  )
}

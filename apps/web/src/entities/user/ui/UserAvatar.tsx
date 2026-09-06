import { Avatar, calcInitialsAvatarColor } from '@vkontakte/vkui'
import { initials } from '@/shared/lib'
import type { UserDto } from '../model/types'

type Props = {
  user: Pick<UserDto, 'id' | 'firstName' | 'lastName'>
  size?: 24 | 28 | 32 | 36 | 40 | 48 | 56 | 64 | 72 | 96
}

export function UserAvatar({ user, size = 32 }: Props) {
  return (
    <Avatar
      size={size}
      initials={initials(user.firstName, user.lastName)}
      gradientColor={calcInitialsAvatarColor(user.id)}
      aria-label={`${user.firstName} ${user.lastName}`}
    />
  )
}

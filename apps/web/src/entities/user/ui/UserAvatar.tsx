import { Avatar } from '@vkontakte/vkui'
import type { UserDto } from '@/shared/api'
import { initials } from '@/shared/lib'

type Props = {
  user: Pick<UserDto, 'id' | 'firstName' | 'lastName'>
  size?: 24 | 28 | 32 | 36 | 40 | 48 | 56 | 72 | 96
}

export function UserAvatar({ user, size = 32 }: Props) {
  const gradient = ((user.id % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6
  return (
    <Avatar
      size={size}
      initials={initials(user.firstName, user.lastName)}
      gradientColor={gradient}
      aria-label={`${user.firstName} ${user.lastName}`}
    />
  )
}

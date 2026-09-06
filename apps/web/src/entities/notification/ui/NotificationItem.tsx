import { Avatar, Badge, calcInitialsAvatarColor, RichCell } from '@vkontakte/vkui'
import { initials, RouterAnchor, relativeTime } from '@/shared/lib'
import { describeNotification } from '../model/kinds'
import type { NotificationDto } from '../model/types'

export function NotificationItem({ notification }: { notification: NotificationDto }) {
  const { Icon, text, href } = describeNotification(notification)
  const unread = notification.readAt === null
  const { actor } = notification

  return (
    <RichCell
      Component={RouterAnchor}
      href={href}
      before={
        actor ? (
          <Avatar
            size={48}
            initials={initials(actor.firstName, actor.lastName)}
            gradientColor={calcInitialsAvatarColor(actor.id)}
          />
        ) : (
          <Icon width={28} height={28} />
        )
      }
      subtitle={relativeTime(notification.createdAt)}
      after={unread ? <Badge mode="prominent" /> : undefined}
    >
      {text}
    </RichCell>
  )
}

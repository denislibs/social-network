import { Icon28Notification } from '@vkontakte/icons'
import { Counter, IconButton, Popover } from '@vkontakte/vkui'
import { useNotificationBell } from '../model/useNotificationBell'
import styles from './NotificationBell.module.css'
import { NotificationsPanel } from './NotificationsPanel'

export function NotificationBell() {
  const { label, count, previewItems, onShownChange } = useNotificationBell()

  return (
    <Popover
      trigger="click"
      placement="bottom-end"
      content={<NotificationsPanel items={previewItems} />}
      onShownChange={onShownChange}
    >
      <div className={styles.wrap}>
        <IconButton label={label}>
          <Icon28Notification />
        </IconButton>
        {count > 0 && (
          <Counter className={styles.counter} size="s" mode="primary">
            {count}
          </Counter>
        )}
      </div>
    </Popover>
  )
}

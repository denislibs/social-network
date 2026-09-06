import { Counter, Group, SimpleCell } from '@vkontakte/vkui'
import { useSession } from '@/entities/session'
import { userHandle } from '@/entities/user'
import { NavAnchor, pluralRu } from '@/shared/lib'
import { NAV_ITEMS } from '../model/nav'
import { useFriendsBadge } from '../model/useFriendsBadge'
import styles from './app-shell.module.css'

const REQUEST_FORMS: [string, string, string] = ['заявка', 'заявки', 'заявок']

export function SideNav() {
  const { user } = useSession()
  const { count } = useFriendsBadge()

  return (
    <nav aria-label="Основная навигация" className={styles.nav}>
      <Group mode="plain">
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          const href = to === '/profile' && user ? `/${userHandle(user)}` : to
          const isFriends = to === '/friends'
          return (
            <SimpleCell
              key={to}
              Component={NavAnchor}
              href={href}
              before={<Icon />}
              indicator={
                isFriends && count > 0 ? (
                  <Counter aria-label={`${count} ${pluralRu(count, REQUEST_FORMS)}`} size="s">
                    {count}
                  </Counter>
                ) : undefined
              }
            >
              {label}
            </SimpleCell>
          )
        })}
      </Group>
    </nav>
  )
}

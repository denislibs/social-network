import { Group, SimpleCell } from '@vkontakte/vkui'
import { NavAnchor } from '@/shared/lib'
import { NAV_ITEMS } from '../model/nav'
import styles from './app-shell.module.css'

export function SideNav() {
  return (
    <nav aria-label="Основная навигация" className={styles.nav}>
      <Group mode="plain">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <SimpleCell key={to} Component={NavAnchor} href={to} before={<Icon />}>
            {label}
          </SimpleCell>
        ))}
      </Group>
    </nav>
  )
}

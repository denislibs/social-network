import { Icon12Dropdown, Icon28Notification } from '@vkontakte/icons'
import { Box, Button, IconButton, Link, Text } from '@vkontakte/vkui'
import { useNavigate } from 'react-router'
import { useSession } from '@/entities/session'
import { UserAvatar, userHandle } from '@/entities/user'
import { LogoutButton } from '@/features/auth'
import { SearchBox } from '@/features/search'
import { ThemeToggle } from '@/features/theme'
import { RouterAnchor } from '@/shared/lib'
import styles from './app-shell.module.css'

/**
 * vk.ru's top bar: a 48px content-coloured strip with a separator underneath. The wordmark sits
 * in a block as wide as the left menu so the search field starts exactly where the content
 * column does, and the right cluster keeps 28px icons (the only place we use that size).
 */
export function AppHeader({ bare }: { bare: boolean }) {
  const { user, status } = useSession()
  const navigate = useNavigate()
  return (
    <Box Component="header" position="sticky" insetBlockStart={0} className={styles.header}>
      <div className={styles.brand}>
        <Link Component={RouterAnchor} href="/feed" aria-label="ВКлон, на главную" noUnderline>
          <Text weight="2">ВКлон</Text>
        </Link>
      </div>
      {!bare && (
        <div className={styles.search}>
          <SearchBox />
        </div>
      )}
      <div className={styles.grow} />
      {status === 'authed' && !bare && (
        <IconButton label="Уведомления: скоро" disabled>
          <Icon28Notification />
        </IconButton>
      )}
      <ThemeToggle />
      {status === 'authed' && user && (
        <>
          <Link
            Component={RouterAnchor}
            href={`/${userHandle(user)}`}
            className={styles.account}
            noUnderline
          >
            <UserAvatar user={user} size={32} />
            <Icon12Dropdown />
          </Link>
          <LogoutButton />
        </>
      )}
      {status === 'guest' && !bare && (
        <Button mode="secondary" size="s" onClick={() => navigate('/login')}>
          Войти
        </Button>
      )}
    </Box>
  )
}

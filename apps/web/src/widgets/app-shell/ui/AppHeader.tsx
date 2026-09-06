import { Icon12Dropdown } from '@vkontakte/icons'
import { Box, Button, Link, Text } from '@vkontakte/vkui'
import { useNavigate } from 'react-router'
import { useSession } from '@/entities/session'
import { UserAvatar, userHandle } from '@/entities/user'
import { LogoutButton } from '@/features/auth'
import { NotificationBell } from '@/features/notifications'
import { SearchBox } from '@/features/search'
import { ThemeToggle } from '@/features/theme'
import { RouterAnchor } from '@/shared/lib'
import styles from './app-shell.module.css'

/**
 * vk.ru's top bar: a 48px content-coloured strip with a separator underneath, full-bleed across
 * the viewport. `.headerInner` centres the actual row (wordmark, search, right cluster) with the
 * same 1128px max-width as the shell's content, so at wide viewports the search sits above the
 * content column instead of staying pinned to the left edge. The wordmark sits in a block as wide
 * as the left menu so the search field starts exactly where the content column does, and the
 * right cluster keeps 28px icons (the only place we use that size).
 */
export function AppHeader({ bare }: { bare: boolean }) {
  const { user, status } = useSession()
  const navigate = useNavigate()
  return (
    <Box Component="header" position="sticky" insetBlockStart={0} className={styles.header}>
      <div className={styles.headerInner}>
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
        {status === 'authed' && !bare && <NotificationBell />}
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
      </div>
    </Box>
  )
}

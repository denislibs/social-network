import { Box, Button, Link, Text } from '@vkontakte/vkui'
import { useNavigate } from 'react-router'
import { useSession } from '@/entities/session'
import { UserAvatar } from '@/entities/user'
import { LogoutButton } from '@/features/auth'
import { SearchBox } from '@/features/search'
import { ThemeToggle } from '@/features/theme'
import { RouterAnchor } from '@/shared/lib'
import styles from './app-shell.module.css'

export function AppHeader({ bare }: { bare: boolean }) {
  const { user, status } = useSession()
  const navigate = useNavigate()
  return (
    <Box Component="header" position="sticky" insetBlockStart={0} className={styles.header}>
      <Link Component={RouterAnchor} href="/feed" aria-label="ВКлон, на главную" noUnderline>
        <Text weight="2">ВКлон</Text>
      </Link>
      {!bare && (
        <div className={styles.search}>
          <SearchBox />
        </div>
      )}
      <div className={styles.grow} />
      <ThemeToggle />
      {status === 'authed' && user && (
        <>
          <UserAvatar user={user} size={32} />
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

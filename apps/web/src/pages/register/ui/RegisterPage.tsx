import { Box, Footnote, Group, Link, Panel, PanelHeader } from '@vkontakte/vkui'
import { useNavigate } from 'react-router'
import { useSession } from '@/entities/session'
import { RegisterForm } from '@/features/auth'
import { RouterAnchor } from '@/shared/lib'

export function RegisterPage() {
  const { setUser } = useSession()
  const navigate = useNavigate()

  return (
    <Panel>
      <PanelHeader>Регистрация</PanelHeader>
      <Group mode="card">
        <RegisterForm
          onSuccess={(u) => {
            setUser(u)
            navigate('/feed', { replace: true })
          }}
        />
        <Box padding="system">
          <Footnote>
            Уже есть аккаунт?{' '}
            <Link Component={RouterAnchor} href="/login">
              Войти
            </Link>
          </Footnote>
        </Box>
      </Group>
    </Panel>
  )
}

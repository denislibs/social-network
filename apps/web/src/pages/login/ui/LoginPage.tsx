import { Div, Footnote, Group, Link, Panel, PanelHeader } from '@vkontakte/vkui'
import { useLocation, useNavigate } from 'react-router'
import { useSession } from '@/entities/session'
import { LoginForm } from '@/features/auth'
import { RouterAnchor } from '@/shared/lib'

export function LoginPage() {
  const { setUser } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const redirect = (location.state as { redirect?: string } | null)?.redirect ?? '/feed'

  return (
    <Panel>
      <PanelHeader>Вход</PanelHeader>
      <Group mode="card">
        <LoginForm
          onSuccess={(u) => {
            setUser(u)
            navigate(redirect, { replace: true })
          }}
        />
        <Div>
          <Footnote>
            Нет аккаунта?{' '}
            <Link Component={RouterAnchor} href="/register">
              Зарегистрироваться
            </Link>
          </Footnote>
        </Div>
      </Group>
    </Panel>
  )
}

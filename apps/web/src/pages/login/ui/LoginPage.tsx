import { Box, Footnote, Group, Link, Panel, PanelHeader } from '@vkontakte/vkui'
import { LoginForm, useAuthRedirect } from '@/features/auth'
import { RouterAnchor } from '@/shared/lib'

export function LoginPage() {
  const { onAuthenticated } = useAuthRedirect()

  return (
    <Panel>
      <PanelHeader>Вход</PanelHeader>
      <Group mode="card">
        <LoginForm onSuccess={onAuthenticated} />
        <Box padding="system">
          <Footnote>
            Нет аккаунта?{' '}
            <Link Component={RouterAnchor} href="/register">
              Зарегистрироваться
            </Link>
          </Footnote>
        </Box>
      </Group>
    </Panel>
  )
}

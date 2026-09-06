import { Box, Footnote, Group, Link, Panel, PanelHeader } from '@vkontakte/vkui'
import { RegisterForm, useAuthRedirect } from '@/features/auth'
import { RouterAnchor } from '@/shared/lib'

export function RegisterPage() {
  const { onAuthenticated } = useAuthRedirect()

  return (
    <Panel>
      <PanelHeader>Регистрация</PanelHeader>
      <Group mode="card">
        <RegisterForm onSuccess={onAuthenticated} />
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

import { Button, FormItem, FormLayoutGroup, Input } from '@vkontakte/vkui'
import type { UserDto } from '@/shared/api'
import { useLoginForm } from '../model/useLoginForm'

export function LoginForm({ onSuccess }: { onSuccess: (u: UserDto) => void }) {
  const f = useLoginForm(onSuccess)

  const status = (field: 'login' | 'password') => (f.error?.field === field ? 'error' : 'default')

  return (
    <form onSubmit={f.submit} noValidate>
      <FormLayoutGroup mode="vertical">
        <FormItem
          htmlFor="login"
          top="Логин"
          status={status('login')}
          bottom={f.error?.field === 'login' ? f.error.text : undefined}
          bottomId="login-error"
        >
          <Input
            id="login"
            name="login"
            autoComplete="username"
            value={f.values.login}
            onChange={(e) => f.setField('login', e.target.value)}
            disabled={f.busy}
            slotProps={{
              input: {
                'aria-describedby': f.error?.field === 'login' ? 'login-error' : undefined,
                'aria-invalid': f.error?.field === 'login',
              },
            }}
          />
        </FormItem>
        <FormItem
          htmlFor="password"
          top="Пароль"
          status={status('password')}
          bottom={f.error?.field === 'password' ? f.error.text : undefined}
          bottomId="password-error"
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={f.values.password}
            onChange={(e) => f.setField('password', e.target.value)}
            disabled={f.busy}
            slotProps={{
              input: {
                'aria-describedby':
                  f.error?.field === 'password'
                    ? 'password-error'
                    : f.error?.field === 'form'
                      ? 'form-error'
                      : undefined,
                'aria-invalid': f.error?.field === 'password',
              },
            }}
          />
        </FormItem>
        <FormItem
          status={f.error?.field === 'form' ? 'error' : 'default'}
          bottom={f.error?.field === 'form' ? f.error.text : undefined}
          bottomId="form-error"
        >
          <Button type="submit" size="l" stretched mode="primary" loading={f.busy}>
            Войти
          </Button>
        </FormItem>
      </FormLayoutGroup>
    </form>
  )
}

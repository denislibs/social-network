import { Button, FormItem, FormLayoutGroup, Input } from '@vkontakte/vkui'
import type { UserDto } from '@/shared/api'
import { useRegisterForm } from '../model/useRegisterForm'

export function RegisterForm({ onSuccess }: { onSuccess: (u: UserDto) => void }) {
  const f = useRegisterForm(onSuccess)

  const status = (field: 'login' | 'password') => (f.error?.field === field ? 'error' : 'default')
  const bottom = (field: 'login' | 'password') =>
    f.error?.field === field ? f.error.text : undefined

  return (
    <form onSubmit={f.submit} noValidate>
      <FormLayoutGroup mode="vertical">
        <FormItem
          htmlFor="reg-login"
          top="Логин"
          status={status('login')}
          bottom={bottom('login')}
          bottomId="reg-login-error"
        >
          <Input
            id="reg-login"
            name="login"
            autoComplete="username"
            value={f.values.login}
            onChange={(e) => f.setField('login', e.target.value)}
            disabled={f.busy}
            slotProps={{
              input: {
                'aria-describedby': f.error?.field === 'login' ? 'reg-login-error' : undefined,
                'aria-invalid': f.error?.field === 'login',
              },
            }}
          />
        </FormItem>
        <FormItem htmlFor="reg-first" top="Имя">
          <Input
            id="reg-first"
            name="firstName"
            autoComplete="given-name"
            value={f.values.firstName}
            onChange={(e) => f.setField('firstName', e.target.value)}
            disabled={f.busy}
          />
        </FormItem>
        <FormItem htmlFor="reg-last" top="Фамилия">
          <Input
            id="reg-last"
            name="lastName"
            autoComplete="family-name"
            value={f.values.lastName}
            onChange={(e) => f.setField('lastName', e.target.value)}
            disabled={f.busy}
          />
        </FormItem>
        <FormItem
          htmlFor="reg-password"
          top="Пароль"
          status={status('password')}
          bottom={bottom('password')}
          bottomId="reg-password-error"
        >
          <Input
            id="reg-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={f.values.password}
            onChange={(e) => f.setField('password', e.target.value)}
            disabled={f.busy}
            slotProps={{
              input: {
                'aria-describedby':
                  f.error?.field === 'password'
                    ? 'reg-password-error'
                    : f.error?.field === 'form'
                      ? 'reg-form-error'
                      : undefined,
                'aria-invalid': f.error?.field === 'password',
              },
            }}
          />
        </FormItem>
        <FormItem
          status={f.error?.field === 'form' ? 'error' : 'default'}
          bottom={f.error?.field === 'form' ? f.error.text : undefined}
          bottomId="reg-form-error"
        >
          <Button type="submit" size="l" stretched mode="primary" loading={f.busy}>
            Зарегистрироваться
          </Button>
        </FormItem>
      </FormLayoutGroup>
    </form>
  )
}

import { Button, FormItem, FormLayoutGroup, Input } from '@vkontakte/vkui'
import { type FormEvent, useState } from 'react'
import type { UserDto } from '@/shared/api'
import { authApi } from '../api/authApi'
import { codeOf, fieldFor, messageFor } from '../model/errors'

type FieldError = { field: 'login' | 'password' | 'form'; text: string }

export function LoginForm({ onSuccess }: { onSuccess: (u: UserDto) => void }) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<FieldError | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      onSuccess(await authApi.login({ login, password }))
    } catch (err) {
      const code = codeOf(err)
      setError({ field: fieldFor(code), text: messageFor(code) })
    } finally {
      setBusy(false)
    }
  }

  const status = (f: 'login' | 'password') => (error?.field === f ? 'error' : 'default')

  return (
    <form onSubmit={submit} noValidate>
      <FormLayoutGroup mode="vertical">
        <FormItem
          htmlFor="login"
          top="Логин"
          status={status('login')}
          bottom={error?.field === 'login' ? error.text : undefined}
          bottomId="login-error"
        >
          <Input
            id="login"
            name="login"
            autoComplete="username"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            disabled={busy}
            slotProps={{
              input: {
                'aria-describedby': error?.field === 'login' ? 'login-error' : undefined,
              },
            }}
          />
        </FormItem>
        <FormItem
          htmlFor="password"
          top="Пароль"
          status={status('password')}
          bottom={error?.field === 'password' ? error.text : undefined}
          bottomId="password-error"
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            slotProps={{
              input: {
                'aria-describedby':
                  error?.field === 'password'
                    ? 'password-error'
                    : error?.field === 'form'
                      ? 'form-error'
                      : undefined,
              },
            }}
          />
        </FormItem>
        <FormItem
          status={error?.field === 'form' ? 'error' : 'default'}
          bottom={error?.field === 'form' ? error.text : undefined}
          bottomId="form-error"
        >
          <Button type="submit" size="l" stretched mode="primary" loading={busy}>
            Войти
          </Button>
        </FormItem>
      </FormLayoutGroup>
    </form>
  )
}

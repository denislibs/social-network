import { Button, FormItem, FormLayoutGroup, Input } from '@vkontakte/vkui'
import { type ChangeEvent, type FormEvent, useState } from 'react'
import type { UserDto } from '@/shared/api'
import { authApi } from '../api/authApi'
import { codeOf, fieldFor, messageFor } from '../model/errors'

type Field = 'login' | 'firstName' | 'lastName' | 'password'
type FieldError = { field: 'login' | 'password' | 'form'; text: string }
const EMPTY: Record<Field, string> = { login: '', firstName: '', lastName: '', password: '' }

export function RegisterForm({ onSuccess }: { onSuccess: (u: UserDto) => void }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState<FieldError | null>(null)
  const [busy, setBusy] = useState(false)

  const set = (f: Field) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm((s) => ({ ...s, [f]: e.target.value }))
    if (error) setError(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      onSuccess(await authApi.register(form))
    } catch (err) {
      const code = codeOf(err)
      setError({ field: fieldFor(code), text: messageFor(code) })
    } finally {
      setBusy(false)
    }
  }

  const status = (f: 'login' | 'password') => (error?.field === f ? 'error' : 'default')
  const bottom = (f: 'login' | 'password') => (error?.field === f ? error.text : undefined)

  return (
    <form onSubmit={submit} noValidate>
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
            value={form.login}
            onChange={set('login')}
            disabled={busy}
            slotProps={{
              input: {
                'aria-describedby': error?.field === 'login' ? 'reg-login-error' : undefined,
                'aria-invalid': error?.field === 'login',
              },
            }}
          />
        </FormItem>
        <FormItem htmlFor="reg-first" top="Имя">
          <Input
            id="reg-first"
            name="firstName"
            autoComplete="given-name"
            value={form.firstName}
            onChange={set('firstName')}
            disabled={busy}
          />
        </FormItem>
        <FormItem htmlFor="reg-last" top="Фамилия">
          <Input
            id="reg-last"
            name="lastName"
            autoComplete="family-name"
            value={form.lastName}
            onChange={set('lastName')}
            disabled={busy}
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
            value={form.password}
            onChange={set('password')}
            disabled={busy}
            slotProps={{
              input: {
                'aria-describedby':
                  error?.field === 'password'
                    ? 'reg-password-error'
                    : error?.field === 'form'
                      ? 'reg-form-error'
                      : undefined,
                'aria-invalid': error?.field === 'password',
              },
            }}
          />
        </FormItem>
        <FormItem
          status={error?.field === 'form' ? 'error' : 'default'}
          bottom={error?.field === 'form' ? error.text : undefined}
          bottomId="reg-form-error"
        >
          <Button type="submit" size="l" stretched mode="primary" loading={busy}>
            Зарегистрироваться
          </Button>
        </FormItem>
      </FormLayoutGroup>
    </form>
  )
}

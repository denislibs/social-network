import { A, useNavigate } from '@solidjs/router'
import { Button, FormItem, Group, Input, Typography } from '@vkc/ui-kit'
import { createSignal, Show } from 'solid-js'
import { errorInfo } from '~/shared/api/client'
import { useSession } from '~/shared/session/session'
import { authApi } from '../api'
import s from './auth.module.css'

const MESSAGES: Record<string, string> = {
  login_taken: 'Логин занят',
  weak_password: 'Минимум 8 символов',
  invalid_login: '3–32 символа: латиница, цифры, _ .',
  empty_name: 'Введите имя и фамилию',
  validation: 'Заполните все поля',
}
type Field = 'login' | 'password' | 'form'
const FIELD_OF: Record<string, Field> = {
  login_taken: 'login',
  invalid_login: 'login',
  weak_password: 'password',
}
type RegisterForm = { login: string; firstName: string; lastName: string; password: string }

export default function RegisterPage() {
  const nav = useNavigate()
  const session = useSession()
  const [form, setForm] = createSignal<RegisterForm>({
    login: '',
    firstName: '',
    lastName: '',
    password: '',
  })
  const [error, setError] = createSignal<{ field: Field; text: string } | null>(null)
  const [busy, setBusy] = createSignal(false)
  const upd = (k: keyof RegisterForm) => (e: { currentTarget: HTMLInputElement }) => {
    const value = e.currentTarget.value
    setForm((f) => ({ ...f, [k]: value }))
  }
  const submit = async (e: Event) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      session.setUser(await authApi.register(form()))
      nav('/feed')
    } catch (err) {
      const info = errorInfo(err)
      setError(
        info
          ? { field: FIELD_OF[info.code] ?? 'form', text: MESSAGES[info.code] ?? info.message }
          : { field: 'form', text: 'Что-то пошло не так' },
      )
    } finally {
      setBusy(false)
    }
  }
  const status = (f: Field) => (error()?.field === f ? 'error' : 'default')
  const bottom = (f: Field) => (error()?.field === f ? error()?.text : undefined)
  return (
    <div class={s.wrap}>
      <Group padded class={s.card ?? ''}>
        <Typography role="title2" as="h1">
          Регистрация
        </Typography>
        <form onSubmit={submit} class={s.form}>
          <FormItem top="Логин" bottom={bottom('login')} status={status('login')}>
            <Input
              name="login"
              autocomplete="username"
              aria-label="Логин"
              value={form().login}
              onInput={upd('login')}
              status={status('login')}
            />
          </FormItem>
          <FormItem top="Имя">
            <Input
              name="firstName"
              autocomplete="given-name"
              aria-label="Имя"
              value={form().firstName}
              onInput={upd('firstName')}
            />
          </FormItem>
          <FormItem top="Фамилия">
            <Input
              name="lastName"
              autocomplete="family-name"
              aria-label="Фамилия"
              value={form().lastName}
              onInput={upd('lastName')}
            />
          </FormItem>
          <FormItem top="Пароль" bottom={bottom('password')} status={status('password')}>
            <Input
              type="password"
              name="password"
              autocomplete="new-password"
              aria-label="Пароль"
              value={form().password}
              onInput={upd('password')}
              status={status('password')}
            />
          </FormItem>
          <Show when={error()?.field === 'form' ? error() : null}>
            {(e) => (
              <Typography role="footnote" as="p" class={s.formError ?? ''}>
                {e().text}
              </Typography>
            )}
          </Show>
          <Button type="submit" size="l" stretched loading={busy()}>
            Зарегистрироваться
          </Button>
        </form>
        <Typography role="footnote" muted as="p">
          Уже есть аккаунт? <A href="/login">Войти</A>
        </Typography>
      </Group>
    </div>
  )
}

import { A, useNavigate } from '@solidjs/router'
import { Button, FormItem, Group, Input, Typography } from '@vkc/ui-kit'
import { createSignal } from 'solid-js'
import { errorInfo } from '~/shared/api/client'
import { useSession } from '~/shared/session/session'
import { authApi } from '../api'
import s from './auth.module.css'

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Неверный логин или пароль',
  validation: 'Заполните все поля',
}

export default function LoginPage() {
  const nav = useNavigate()
  const session = useSession()
  const [login, setLogin] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [error, setError] = createSignal<string | null>(null)
  const [busy, setBusy] = createSignal(false)
  const submit = async (e: Event) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      session.setUser(await authApi.login({ login: login(), password: password() }))
      nav('/feed')
    } catch (err) {
      const info = errorInfo(err)
      setError(info ? (MESSAGES[info.code] ?? info.message) : 'Что-то пошло не так')
    } finally {
      setBusy(false)
    }
  }
  const status = () => (error() ? 'error' : 'default')
  return (
    <div class={s.wrap}>
      <Group padded class={s.card ?? ''}>
        <Typography role="title2" as="h1">
          Вход
        </Typography>
        <form onSubmit={submit} class={s.form}>
          <FormItem top="Логин">
            <Input
              name="login"
              autocomplete="username"
              aria-label="Логин"
              value={login()}
              onInput={(e) => setLogin(e.currentTarget.value)}
              status={status()}
            />
          </FormItem>
          <FormItem top="Пароль" bottom={error()} status={status()}>
            <Input
              type="password"
              name="password"
              autocomplete="current-password"
              aria-label="Пароль"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              status={status()}
            />
          </FormItem>
          <Button type="submit" size="l" stretched loading={busy()}>
            Войти
          </Button>
        </form>
        <Typography role="footnote" muted as="p">
          Нет аккаунта? <A href="/register">Зарегистрироваться</A>
        </Typography>
      </Group>
    </div>
  )
}

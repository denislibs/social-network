import { Navigate } from '@solidjs/router'
import { Skeleton } from '@vkc/ui-kit'
import { type JSX, Match, Switch } from 'solid-js'
import { useSession } from '~/shared/session/session'

export function RequireAuth(props: { children: JSX.Element }) {
  const s = useSession()
  return (
    <Switch>
      <Match when={s.status() === 'loading'}>
        <Skeleton height={200} radius={12} />
      </Match>
      <Match when={s.status() === 'guest'}>
        <Navigate href="/login" />
      </Match>
      <Match when={s.status() === 'authed'}>{props.children}</Match>
    </Switch>
  )
}

import type { UserDto } from '@vkc/contracts'
import { type Accessor, createContext, createSignal, type JSX, onMount, useContext } from 'solid-js'
import { api, unwrap } from '~/shared/api/client'

type Status = 'loading' | 'authed' | 'guest'
type Session = {
  user: Accessor<UserDto | null>
  status: Accessor<Status>
  setUser(u: UserDto | null): void
  refresh(): Promise<void>
  logout(): Promise<void>
}

const Ctx = createContext<Session>()

export function SessionProvider(props: { children: JSX.Element }) {
  const [user, setUserSig] = createSignal<UserDto | null>(null)
  const [status, setStatus] = createSignal<Status>('loading')
  const setUser = (u: UserDto | null) => {
    setUserSig(u)
    setStatus(u ? 'authed' : 'guest')
  }
  const refresh = async () => {
    try {
      setUser(unwrap(await api.api.v1.me.get()).user)
    } catch (e) {
      // 401 — обычное состояние гостя, всё остальное стоит увидеть в консоли.
      if ((e as { status?: number }).status !== 401) console.error(e)
      setUser(null)
    }
  }
  const logout = async () => {
    await api.api.v1.auth.logout.post()
    setUser(null)
  }
  onMount(() => {
    void refresh()
  })
  return (
    <Ctx.Provider value={{ user, status, setUser, refresh, logout }}>{props.children}</Ctx.Provider>
  )
}

export function useSession(): Session {
  const s = useContext(Ctx)
  if (!s) throw new Error('useSession outside SessionProvider')
  return s
}

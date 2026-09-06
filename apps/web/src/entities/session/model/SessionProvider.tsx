import { createContext, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import type { UserDto } from '@/shared/api'
import { ApiError, api, onUnauthorized, unwrap } from '@/shared/api'

export type SessionStatus = 'loading' | 'authed' | 'guest'
export type Session = {
  user: UserDto | null
  status: SessionStatus
  setUser: (u: UserDto | null) => void
  logout: () => Promise<void>
}
export const SessionContext = createContext<Session | null>(null)

type SessionState = { user: UserDto | null; status: SessionStatus }

// Pure, module-level: the state setter is the only thing the callbacks below
// close over, so none of them needs another hook value in its dependency list.
const sessionFor = (user: UserDto | null): SessionState => ({
  user,
  status: user ? 'authed' : 'guest',
})

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ user: null, status: 'loading' })
  const setUser = useCallback((u: UserDto | null) => setState(sessionFor(u)), [])
  const logout = useCallback(async () => {
    try {
      await api.api.v1.auth.logout.post()
    } catch (e) {
      console.error('logout request failed; clearing session anyway', e)
    } finally {
      setState(sessionFor(null))
    }
  }, [])
  useEffect(() => {
    // Initial session fetch on mount; state is set asynchronously once the
    // network response arrives, not synchronously during this effect.
    void (async () => {
      try {
        setState(sessionFor(unwrap(await api.api.v1.me.get(), { silent401: true }).user))
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 401)) console.error(e)
        setState(sessionFor(null))
      }
    })()
  }, [])
  useEffect(
    () => onUnauthorized(() => setState((s) => (s.status === 'authed' ? sessionFor(null) : s))),
    [],
  )
  const value = useMemo(() => ({ ...state, setUser, logout }), [state, setUser, logout])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

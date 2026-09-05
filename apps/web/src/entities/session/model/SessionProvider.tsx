import { createContext, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import type { UserDto } from '@/shared/api'
import { ApiError, api, onUnauthorized, unwrap } from '@/shared/api'

export type SessionStatus = 'loading' | 'authed' | 'guest'
export type Session = {
  user: UserDto | null
  status: SessionStatus
  setUser: (u: UserDto | null) => void
  refresh: () => Promise<void>
  logout: () => Promise<void>
}
export const SessionContext = createContext<Session | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserDto | null>(null)
  const [status, setStatus] = useState<SessionStatus>('loading')
  const setUser = useCallback((u: UserDto | null) => {
    setUserState(u)
    setStatus(u ? 'authed' : 'guest')
  }, [])
  const refresh = useCallback(async () => {
    try {
      setUser(unwrap(await api.api.v1.me.get(), { silent401: true }).user)
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) console.error(e)
      setUser(null)
    }
  }, [setUser])
  const logout = useCallback(async () => {
    try {
      await api.api.v1.auth.logout.post()
    } catch (e) {
      console.error('logout request failed; clearing session anyway', e)
    } finally {
      setUser(null)
    }
  }, [setUser])
  useEffect(() => {
    // Initial session fetch on mount; `refresh` sets state asynchronously once the
    // network response arrives, not synchronously during this effect.
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh()
  }, [refresh])
  useEffect(
    () =>
      onUnauthorized(() => setStatus((s) => (s === 'authed' ? (setUserState(null), 'guest') : s))),
    [],
  )
  const value = useMemo(
    () => ({ user, status, setUser, refresh, logout }),
    [user, status, setUser, refresh, logout],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

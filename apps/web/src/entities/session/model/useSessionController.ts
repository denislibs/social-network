import { useCallback, useEffect, useMemo, useState } from 'react'
import { UNAUTHORIZED_BUS, type UserDto } from '@/shared/api'
import { useService } from '@/shared/di'
import { SESSION_GATEWAY } from './ports'
import type { Session, SessionStatus } from './SessionProvider'

type SessionState = { user: UserDto | null; status: SessionStatus }

// Pure, module-level: the state setter is the only thing the callbacks below
// close over, so none of them needs another hook value in its dependency list.
const sessionFor = (user: UserDto | null): SessionState => ({
  user,
  status: user ? 'authed' : 'guest',
})

export function useSessionController(): Session {
  const gateway = useService(SESSION_GATEWAY)
  const bus = useService(UNAUTHORIZED_BUS)
  const [state, setState] = useState<SessionState>({ user: null, status: 'loading' })
  const setUser = useCallback((u: UserDto | null) => setState(sessionFor(u)), [])
  const logout = useCallback(async () => {
    try {
      await gateway.logout()
    } catch (e) {
      console.error('logout request failed; clearing session anyway', e)
    } finally {
      setState(sessionFor(null))
    }
  }, [gateway])
  useEffect(() => {
    // Initial session fetch on mount; state is set asynchronously once the
    // network response arrives, not synchronously during this effect.
    void (async () => {
      try {
        setState(sessionFor(await gateway.me()))
      } catch (e) {
        console.error(e)
        setState(sessionFor(null))
      }
    })()
  }, [gateway])
  useEffect(
    () => bus.on(() => setState((s) => (s.status === 'authed' ? sessionFor(null) : s))),
    [bus],
  )
  return useMemo(() => ({ ...state, setUser, logout }), [state, setUser, logout])
}

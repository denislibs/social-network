import { createContext, type ReactNode } from 'react'
import type { UserDto } from '@/shared/api'
import { useSessionController } from './useSessionController'

export type SessionStatus = 'loading' | 'authed' | 'guest'
export type Session = {
  user: UserDto | null
  status: SessionStatus
  setUser: (u: UserDto | null) => void
  logout: () => Promise<void>
}
export const SessionContext = createContext<Session | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useSessionController()
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}

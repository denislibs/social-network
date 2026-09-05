import { useContext } from 'react'
import { type Session, SessionContext } from './SessionProvider'

export function useSession(): Session {
  const s = useContext(SessionContext)
  if (!s) throw new Error('useSession outside SessionProvider')
  return s
}

import { PanelSpinner } from '@vkontakte/vkui'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useSession } from '../model/useSession'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const { pathname, search, hash } = useLocation()
  if (status === 'loading') return <PanelSpinner />
  if (status === 'guest') {
    const redirect = `${pathname}${search}${hash}`
    return <Navigate to="/login" replace state={{ redirect }} />
  }
  return <>{children}</>
}

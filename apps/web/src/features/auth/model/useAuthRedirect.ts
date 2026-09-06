import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useSession } from '@/entities/session'
import type { UserDto } from '@/shared/api'

export function useAuthRedirect() {
  const { setUser } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { redirect?: string } | null)?.redirect ?? '/feed'
  const onAuthenticated = useCallback(
    (u: UserDto) => {
      setUser(u)
      navigate(redirectTo, { replace: true })
    },
    [setUser, navigate, redirectTo],
  )
  return { onAuthenticated, redirectTo }
}

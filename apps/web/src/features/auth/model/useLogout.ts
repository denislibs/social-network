import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '@/entities/session'

export function useLogout() {
  const { logout: sessionLogout } = useSession()
  const navigate = useNavigate()
  const logout = useCallback(async () => {
    await sessionLogout()
    navigate('/login')
  }, [sessionLogout, navigate])
  return { logout }
}

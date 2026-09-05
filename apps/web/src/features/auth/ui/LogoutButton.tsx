import { Button } from '@vkontakte/vkui'
import { useNavigate } from 'react-router'
import { useSession } from '@/entities/session'

export function LogoutButton() {
  const { logout } = useSession()
  const navigate = useNavigate()
  const handleClick = async () => {
    await logout()
    navigate('/login')
  }
  return (
    <Button mode="tertiary" size="s" onClick={handleClick}>
      Выйти
    </Button>
  )
}

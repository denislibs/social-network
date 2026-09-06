import { Button } from '@vkontakte/vkui'
import { useLogout } from '../model/useLogout'

export function LogoutButton() {
  const { logout } = useLogout()
  return (
    <Button mode="tertiary" size="s" onClick={logout}>
      Выйти
    </Button>
  )
}

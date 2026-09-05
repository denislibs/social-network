import { Icon28MoonOutline, Icon28SunOutline } from '@vkontakte/icons'
import { IconButton } from '@vkontakte/vkui'
import { useColorScheme } from '@/shared/lib'

const LABEL = {
  light: 'Тема: светлая',
  dark: 'Тема: тёмная',
  system: 'Тема: системная',
} as const

export function ThemeToggle() {
  const { pref, scheme, cycle } = useColorScheme()
  return (
    <IconButton label={LABEL[pref]} onClick={cycle}>
      {scheme === 'dark' ? <Icon28SunOutline /> : <Icon28MoonOutline />}
    </IconButton>
  )
}

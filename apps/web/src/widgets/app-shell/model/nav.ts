import {
  Icon24MessageOutline,
  Icon24MusicOutline,
  Icon24NewsfeedOutline,
  Icon24PictureOutline,
  Icon24UserOutline,
  Icon24Users3Outline,
  Icon24UsersOutline,
} from '@vkontakte/icons'
import type { ComponentType } from 'react'

export type NavItem = {
  to: string
  label: string
  Icon: ComponentType
  /** Renders a `Separator` above the item — vk.ru splits the media entries off the core ones. */
  dividerBefore?: boolean
}

/** Order and icon set copied from vk.ru's left menu (24px outline icons, accent-tinted). */
export const NAV_ITEMS: NavItem[] = [
  { to: '/profile', label: 'Профиль', Icon: Icon24UserOutline },
  { to: '/feed', label: 'Лента', Icon: Icon24NewsfeedOutline },
  { to: '/im', label: 'Мессенджер', Icon: Icon24MessageOutline },
  { to: '/friends', label: 'Друзья', Icon: Icon24UsersOutline },
  { to: '/communities', label: 'Сообщества', Icon: Icon24Users3Outline },
  { to: '/photos', label: 'Фото', Icon: Icon24PictureOutline, dividerBefore: true },
  { to: '/music', label: 'Музыка', Icon: Icon24MusicOutline },
]

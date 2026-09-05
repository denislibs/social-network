import {
  Icon28MessageOutline,
  Icon28MusicOutline,
  Icon28NewsfeedOutline,
  Icon28PictureOutline,
  Icon28UserOutline,
  Icon28Users3Outline,
  Icon28UsersOutline,
} from '@vkontakte/icons'
import type { ComponentType } from 'react'

export type NavItem = { to: string; label: string; Icon: ComponentType }

export const NAV_ITEMS: NavItem[] = [
  { to: '/profile', label: 'Профиль', Icon: Icon28UserOutline },
  { to: '/feed', label: 'Лента', Icon: Icon28NewsfeedOutline },
  { to: '/im', label: 'Мессенджер', Icon: Icon28MessageOutline },
  { to: '/friends', label: 'Друзья', Icon: Icon28UsersOutline },
  { to: '/communities', label: 'Сообщества', Icon: Icon28Users3Outline },
  { to: '/photos', label: 'Фото', Icon: Icon28PictureOutline },
  { to: '/music', label: 'Музыка', Icon: Icon28MusicOutline },
]

import { A, useLocation, useNavigate } from '@solidjs/router'
import { Avatar, Button, Counter, Icon, type IconName, Tappable } from '@vkc/ui-kit'
import { createSignal, For, type JSX, Show } from 'solid-js'
import { useSession } from '~/shared/session/session'
import s from './Layout.module.css'
import { getTheme, setTheme, type Theme } from './theme'

const NAV: { href: string; label: string; icon: IconName; count?: number }[] = [
  { href: '/profile', label: 'Профиль', icon: 'user_outline_28' },
  { href: '/feed', label: 'Лента', icon: 'newsfeed_outline_28' },
  { href: '/im', label: 'Мессенджер', icon: 'message_outline_28' },
  { href: '/friends', label: 'Друзья', icon: 'users_outline_28' },
  { href: '/photos', label: 'Фото', icon: 'picture_outline_28' },
  { href: '/music', label: 'Музыка', icon: 'music_outline_28' },
]

/**
 * Ссылка в шапке. Здесь намеренно не используется `<A>`: он всегда сам ставит
 * `aria-current="page"` при точном совпадении пути, и тогда рядом с активным пунктом
 * навигации появлялся бы второй элемент с тем же признаком.
 */
function HeaderLink(props: {
  href: string
  label: string
  class?: string | undefined
  children: JSX.Element
}) {
  const navigate = useNavigate()
  return (
    <a
      href={props.href}
      class={props.class ?? ''}
      aria-label={props.label}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return
        e.preventDefault()
        navigate(props.href)
      }}
    >
      {props.children}
    </a>
  )
}

export function Layout(props: { children?: JSX.Element; aside?: JSX.Element }) {
  const [theme, setLocalTheme] = createSignal<Theme>(getTheme())
  const navigate = useNavigate()
  const location = useLocation()
  const session = useSession()
  /** Страницы входа и регистрации показываются без навигации и правой колонки. */
  const bare = () =>
    location.pathname.startsWith('/login') || location.pathname.startsWith('/register')
  const signOut = async () => {
    await session.logout()
    navigate('/login')
  }
  const toggle = () => {
    const next: Theme = theme() === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setLocalTheme(next)
  }
  return (
    <div class={s.root}>
      <header class={s.header}>
        <HeaderLink href="/feed" class={s.logo} label="ВКлон">
          <span class={s.mark}>ВК</span>
        </HeaderLink>
        <label class={s.search}>
          <Icon name="search_outline_24" size={20} />
          <input placeholder="Поиск" aria-label="Поиск" />
        </label>
        <span class={s.grow} />
        <Tappable
          as="button"
          type="button"
          hoverMode="background"
          class={s.iconBtn ?? ''}
          aria-label="Сменить тему"
          onClick={toggle}
        >
          <Icon name={theme() === 'dark' ? 'sun_outline_24' : 'moon_outline_20'} size={24} />
        </Tappable>
        <Show when={session.status() === 'authed'}>
          <HeaderLink href="/profile" class={s.me} label="Профиль">
            <Avatar size={32} seed={session.user()?.id ?? 'me'} />
          </HeaderLink>
          <Button mode="secondary" size="s" onClick={signOut}>
            Выйти
          </Button>
        </Show>
        <Show when={session.status() === 'guest' && !bare()}>
          <Button mode="secondary" size="s" onClick={() => navigate('/login')}>
            Войти
          </Button>
        </Show>
      </header>
      <div class={`${s.body} ${bare() ? s.bare : ''}`}>
        <Show when={!bare()}>
          <nav class={s.nav} aria-label="Основная навигация">
            <For each={NAV}>
              {(item) => (
                <A
                  href={item.href}
                  class={s.navItem}
                  activeClass={s.navItemActive ?? 'is-active'}
                  inactiveClass={s.navItemIdle ?? 'is-idle'}
                >
                  <Icon name={item.icon} size={22} />
                  <span class={s.navLabel}>{item.label}</span>
                  <Show when={item.count}>
                    {(count) => (
                      <Counter size="s" mode="prominent">
                        {count()}
                      </Counter>
                    )}
                  </Show>
                </A>
              )}
            </For>
          </nav>
        </Show>
        <main class={s.main}>{props.children}</main>
        <Show when={!bare()}>
          <aside class={s.aside}>{props.aside}</aside>
        </Show>
      </div>
    </div>
  )
}

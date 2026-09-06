import { SplitCol, SplitLayout } from '@vkontakte/vkui'
import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { AppHeader } from './AppHeader'
import styles from './app-shell.module.css'
import { SideNav } from './SideNav'

/**
 * vk.ru's desktop frame: a fixed 200px menu column plus a 912px content column that is itself a
 * two-column grid (551 + 16 + 345). `wide` is the full-width row above that grid — the profile
 * header spans both columns there, exactly like vk.ru.
 *
 * Both `wide` and `rightColumn` are slots injected by the caller rather than rendered here: the
 * natural content (PYMK, the profile header) lives in sibling widget slices, and Steiger's
 * `fsd/forbidden-imports` rejects one widget slice importing another. Composing them together is
 * `app/`'s job (the layer above widgets, allowed to import from more than one of them) — same
 * reasoning `SuggestionCard.friendAction` documents for `features/suggestions` vs
 * `features/friendship`.
 *
 * `children` falls back to `<Outlet />` so the shell works both as a layout route (feed, friends,
 * …) and as a plain element a route renders itself when it needs to fill the slots — see
 * `app/routes/HandleRoute.tsx`.
 */
export function AppShell({
  bare = false,
  wide,
  rightColumn,
  children,
}: {
  bare?: boolean
  wide?: ReactNode
  rightColumn?: ReactNode
  children?: ReactNode
}) {
  const content = <main className={styles.main}>{children ?? <Outlet />}</main>
  return (
    <>
      <AppHeader bare={bare} />
      <div className={styles.body}>
        <SplitLayout center>
          {!bare && (
            <SplitCol fixed width={200} maxWidth={200}>
              <SideNav />
            </SplitCol>
          )}
          <SplitCol width={bare ? 480 : 912} maxWidth={bare ? 480 : 912}>
            {bare ? (
              content
            ) : (
              <div className={styles.content}>
                {wide !== undefined && wide !== null && <div className={styles.wide}>{wide}</div>}
                {content}
                <aside className={styles.aside} aria-label="Дополнительно">
                  {rightColumn}
                </aside>
              </div>
            )}
          </SplitCol>
        </SplitLayout>
      </div>
    </>
  )
}

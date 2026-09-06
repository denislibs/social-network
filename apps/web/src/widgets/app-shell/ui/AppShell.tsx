import { SplitCol, SplitLayout } from '@vkontakte/vkui'
import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { AppHeader } from './AppHeader'
import styles from './app-shell.module.css'
import { SideNav } from './SideNav'

/**
 * `rightColumn` is injected by the caller rather than rendered directly here: the natural
 * content (the PYMK block) lives in `widgets/pymk-block`, and Steiger's `fsd/forbidden-imports`
 * rejects one widget slice importing another. Composing the two together is `app/router.tsx`'s
 * job (the layer above widgets, allowed to import from more than one of them) — same reasoning
 * `SuggestionCard.friendAction` documents for `features/suggestions` vs `features/friendship`.
 */
export function AppShell({
  bare = false,
  rightColumn,
}: {
  bare?: boolean
  rightColumn?: ReactNode
}) {
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
          <SplitCol width={bare ? 480 : 551} maxWidth={bare ? 480 : 551} autoSpaced>
            <main className={styles.main}>
              <Outlet />
            </main>
          </SplitCol>
          {!bare && (
            <SplitCol width={345} maxWidth={345}>
              <aside aria-label="Дополнительно">{rightColumn}</aside>
            </SplitCol>
          )}
        </SplitLayout>
      </div>
    </>
  )
}

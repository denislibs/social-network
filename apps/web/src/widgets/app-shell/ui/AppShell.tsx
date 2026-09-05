import { SplitCol, SplitLayout } from '@vkontakte/vkui'
import { Outlet } from 'react-router'
import { AppHeader } from './AppHeader'
import styles from './app-shell.module.css'
import { SideNav } from './SideNav'

export function AppShell({ bare = false }: { bare?: boolean }) {
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
              <aside aria-label="Дополнительно" />
            </SplitCol>
          )}
        </SplitLayout>
      </div>
    </>
  )
}

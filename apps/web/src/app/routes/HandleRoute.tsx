import { Navigate, useLocation, useParams } from 'react-router'
import { useSession } from '@/entities/session'
import { CommunityPage } from '@/pages/community'
import { HandleNotFound, useHandle } from '@/pages/handle'
import { ProfilePage } from '@/pages/profile'
import { AppShell } from '@/widgets/app-shell'
import { CommunityAside, CommunityHeader } from '@/widgets/community-header'
import {
  ProfileAside,
  ProfileAsideSkeleton,
  ProfileCard,
  ProfileCardSkeleton,
} from '@/widgets/profile-card'
import { PymkBlock } from '@/widgets/pymk-block'

/**
 * App-level branch on the resolved handle kind: `pages/profile` and `pages/community` can't
 * import each other (Steiger forbids page-to-page imports), so the "user vs community vs
 * not-found" decision lives here, one layer up, where importing both is allowed.
 *
 * It also renders `AppShell` itself instead of being an outlet inside a layout route. vk.ru's
 * profile header spans both content columns, so it has to go into `AppShell`'s `wide` slot — and
 * only a component that has already resolved the handle can decide what goes there. Resolving it
 * once, here, keeps `AppShell` a pure set of slots and avoids a second `useHandle` call.
 *
 * The auth guard lives here too, instead of `router.tsx` wrapping this route in `RequireAuth`
 * (as every other protected route does): `RequireAuth` renders a bare `PanelSpinner` while the
 * session is loading, which on a cold load of a profile URL would flash before `AppShell` even
 * mounts. Rendering the guard inside the route lets the "loading" branch show the shell frame
 * (header + nav) with the same skeleton the pending-handle branch already uses, so a cold load
 * looks the same whether the session or the handle is what's still resolving. The redirect
 * contract for a guest matches `RequireAuth` exactly: `state.redirect` is the full attempted
 * path (`pathname + search + hash`).
 */
export function HandleRoute() {
  const { handle = '' } = useParams()
  const { status } = useSession()
  const { pathname, search, hash } = useLocation()

  if (status === 'loading') {
    return (
      <AppShell wide={<ProfileCardSkeleton />} rightColumn={<ProfileAsideSkeleton />}>
        {null}
      </AppShell>
    )
  }
  if (status === 'guest') {
    const redirect = `${pathname}${search}${hash}`
    return <Navigate to="/login" replace state={{ redirect }} />
  }
  return <ResolvedHandleRoute handle={handle} />
}

/** Split out so `useHandle` (and its query) is never mounted before the session is `'authed'`. */
function ResolvedHandleRoute({ handle }: { handle: string }) {
  const { data, isPending, isError } = useHandle(handle)

  if (isPending) {
    return (
      <AppShell wide={<ProfileCardSkeleton />} rightColumn={<ProfileAsideSkeleton />}>
        {null}
      </AppShell>
    )
  }
  if (isError || !data) {
    return (
      <AppShell>
        <HandleNotFound />
      </AppShell>
    )
  }
  if (data.kind === 'user') {
    return (
      <AppShell
        wide={<ProfileCard handle={handle} />}
        rightColumn={
          <>
            <ProfileAside handle={handle} />
            <PymkBlock compact />
          </>
        }
      >
        <ProfilePage />
      </AppShell>
    )
  }
  return (
    <AppShell
      wide={<CommunityHeader handle={handle} />}
      rightColumn={
        <>
          <CommunityAside handle={handle} />
          <PymkBlock compact />
        </>
      }
    >
      <CommunityPage />
    </AppShell>
  )
}

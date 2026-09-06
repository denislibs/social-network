import { useParams } from 'react-router'
import { CommunityPage } from '@/pages/community'
import { HandleNotFound, useHandle } from '@/pages/handle'
import { ProfilePage } from '@/pages/profile'
import { AppShell } from '@/widgets/app-shell'
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
 */
export function HandleRoute() {
  const { handle = '' } = useParams()
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
    <AppShell rightColumn={<PymkBlock compact />}>
      <CommunityPage handle={handle} />
    </AppShell>
  )
}

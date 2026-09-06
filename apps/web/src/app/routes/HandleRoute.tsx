import { Panel } from '@vkontakte/vkui'
import { useParams } from 'react-router'
import { CommunityPage } from '@/pages/community'
import { HandleNotFound, useHandle } from '@/pages/handle'
import { ProfilePage } from '@/pages/profile'
import { ProfileCardSkeleton } from '@/widgets/profile-card'

/**
 * App-level branch on the resolved handle kind: `pages/profile` and `pages/community` can't
 * import each other (Steiger forbids page-to-page imports), so the "user vs community vs
 * not-found" decision lives here, one layer up, where importing both is allowed.
 */
export function HandleRoute() {
  const { handle = '' } = useParams()
  const { data, isPending, isError } = useHandle(handle)

  if (isPending) {
    return (
      <Panel>
        <ProfileCardSkeleton />
      </Panel>
    )
  }
  if (isError || !data) return <HandleNotFound />

  return data.kind === 'user' ? <ProfilePage handle={handle} /> : <CommunityPage handle={handle} />
}

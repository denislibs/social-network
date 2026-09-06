import { Panel, PanelHeader } from '@vkontakte/vkui'
import { useCommunity } from '@/widgets/community-header'
import { CommunityMembers } from '@/widgets/community-members'

/** Full member list, reached from the «Все участники» link in `CommunityAside`'s preview card —
 * the community equivalent of `pages/profile/ui/ProfileFriendsPage`. */
export function CommunityMembersPage({ handle }: { handle: string }) {
  const { community } = useCommunity(handle)

  return (
    <Panel>
      <PanelHeader>Участники</PanelHeader>
      {community && <CommunityMembers id={community.id} />}
    </Panel>
  )
}

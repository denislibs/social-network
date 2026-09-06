import { Panel } from '@vkontakte/vkui'
import { CommunityHeader, useCommunity } from '@/widgets/community-header'
import { CommunityMembers } from '@/widgets/community-members'

export function CommunityPage({ handle }: { handle: string }) {
  const { community } = useCommunity(handle)

  return (
    <Panel>
      <CommunityHeader handle={handle} />
      {community && <CommunityMembers id={community.id} />}
    </Panel>
  )
}

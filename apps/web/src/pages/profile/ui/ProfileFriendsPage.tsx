import { Panel, PanelHeader } from '@vkontakte/vkui'
import { FriendsList } from '@/widgets/friends-list'
import { useProfile } from '@/widgets/profile-card'

export function ProfileFriendsPage({ handle }: { handle: string }) {
  const { profile } = useProfile(handle)

  return (
    <Panel>
      <PanelHeader>Друзья</PanelHeader>
      {profile && <FriendsList userId={profile.id} />}
    </Panel>
  )
}

import { Group, Panel, Placeholder } from '@vkontakte/vkui'
import { useParams } from 'react-router'
import { CommunityHeader, useCommunity } from '@/widgets/community-header'
import { CommunityMembers } from '@/widgets/community-members'
import { ProfileCard } from '@/widgets/profile-card'
import { useHandle } from '../model/useHandle'

function CommunityBranch({ handle }: { handle: string }) {
  const { community } = useCommunity(handle)

  return (
    <Panel>
      <CommunityHeader handle={handle} />
      {community && <CommunityMembers id={community.id} />}
    </Panel>
  )
}

function UserBranch({ handle }: { handle: string }) {
  return (
    <Panel>
      <ProfileCard handle={handle} />
      <Group mode="card">
        <Placeholder title="Стена скоро">Появится в подсистеме 3.</Placeholder>
      </Group>
    </Panel>
  )
}

export function HandlePage() {
  const { handle = '' } = useParams()
  const { data, isPending, isError } = useHandle(handle)

  if (isPending) return null
  if (isError || !data) {
    return (
      <Panel>
        <Group mode="card">
          <Placeholder title="Страница не найдена">Проверьте адрес.</Placeholder>
        </Group>
      </Panel>
    )
  }

  return data.kind === 'user' ? <UserBranch handle={handle} /> : <CommunityBranch handle={handle} />
}

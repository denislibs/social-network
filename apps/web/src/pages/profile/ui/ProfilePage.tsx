import { Group, Panel, Placeholder } from '@vkontakte/vkui'
import { ProfileCard } from '@/widgets/profile-card'

export function ProfilePage({ handle }: { handle: string }) {
  return (
    <Panel>
      <ProfileCard handle={handle} />
      <Group mode="card">
        <Placeholder title="Стена скоро">Появится в подсистеме 3.</Placeholder>
      </Group>
    </Panel>
  )
}

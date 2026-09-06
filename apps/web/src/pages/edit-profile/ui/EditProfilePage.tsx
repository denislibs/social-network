import { Group, Panel, PanelHeader, Placeholder } from '@vkontakte/vkui'
import { EditProfileForm, useMyProfile } from '@/features/edit-profile'
import { EditProfilePageSkeleton } from './EditProfilePageSkeleton'

export function EditProfilePage() {
  const { profile, isPending, isError } = useMyProfile()

  return (
    <Panel>
      <PanelHeader>Редактировать страницу</PanelHeader>
      {isPending ? (
        <EditProfilePageSkeleton />
      ) : isError ? (
        <Group mode="card">
          <Placeholder title="Не удалось загрузить профиль" />
        </Group>
      ) : (
        profile && (
          <Group mode="card">
            <EditProfileForm profile={profile} />
          </Group>
        )
      )}
    </Panel>
  )
}

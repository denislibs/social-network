import { Group, Panel, PanelHeader, Placeholder } from '@vkontakte/vkui'
import { EditProfileForm, useMyProfile } from '@/features/edit-profile'
import { EditProfilePageSkeleton } from './EditProfilePageSkeleton'

export function EditProfilePage() {
  const { profile, isPending, showSkeleton, isError } = useMyProfile()

  return (
    <Panel>
      <PanelHeader>Редактировать страницу</PanelHeader>
      {renderBody({ profile, isPending, showSkeleton, isError })}
    </Panel>
  )
}

function renderBody({
  profile,
  isPending,
  showSkeleton,
  isError,
}: {
  profile: ReturnType<typeof useMyProfile>['profile']
  isPending: boolean
  showSkeleton: boolean
  isError: boolean
}) {
  if (showSkeleton) return <EditProfilePageSkeleton />
  // Still in flight, but under the skeleton delay: nothing yet, never the error placeholder.
  if (isPending) return null
  if (isError || !profile) {
    return (
      <Group mode="card">
        <Placeholder title="Не удалось загрузить профиль" />
      </Group>
    )
  }
  return (
    <Group mode="card">
      <EditProfileForm profile={profile} />
    </Group>
  )
}
